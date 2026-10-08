"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { getIn } from "formik";
import type { z } from "zod";
import {
  useAdminList,
  useAdminMutation,
  type MutationRequest,
  type Query,
} from "../api/dashboard.api";
import { DataTable, type Column } from "./DataTable";
import { SearchField, SelectField, TextAreaField } from "./AdminFields";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { toast } from "@/shared/ui/Toast";
import { useZodForm } from "@/shared/hook/useZodForm";
import { useDebounce } from "@/shared/hook/useDebounce";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";

export type Option = { value: string; label: string };

type FormSchema = Parameters<typeof useZodForm>[0]["schema"];
type FormApi = ReturnType<typeof useZodForm<FormSchema>>;

export interface FieldDef {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "number"
    | "url"
    | "date"
    | "datetime-local"
    | "select"
    | "textarea"
    | "checkbox"
    | "checkboxes";
  options?: ReadonlyArray<Option>;
  hint?: string;
}

export interface FormConfig<S extends FormSchema> {
  schema: S;
  fields: FieldDef[];
  initialValues: z.input<S>;
}

const FIELD_RENDERERS: Record<
  NonNullable<FieldDef["type"]>,
  (field: FieldDef, form: FormApi) => ReactNode
> = {
  select: (field, form) => (
    <SelectField
      label={field.label}
      options={field.options ?? []}
      error={form.error(field.name)}
      {...form.getFieldProps(field.name)}
    />
  ),
  textarea: (field, form) => (
    <TextAreaField
      label={field.label}
      hint={field.hint}
      error={form.error(field.name)}
      {...form.getFieldProps(field.name)}
    />
  ),
  checkbox: (field, form) => (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4"
        checked={Boolean(getIn(form.values, field.name))}
        onChange={(event) => void form.setFieldValue(field.name, event.target.checked)}
      />
      {field.label}
    </label>
  ),
  checkboxes: (field, form) => {
    const selected: string[] = getIn(form.values, field.name) ?? [];
    const toggle = (value: string) =>
      void form.setFieldValue(
        field.name,
        selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
      );
    const error = form.error(field.name);
    return (
      <fieldset className="flex flex-col gap-2" aria-invalid={error ? true : undefined}>
        <legend className="mb-1 text-sm font-medium">{field.label}</legend>
        <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
          {(field.options ?? []).map((option) => (
            <label key={option.value} className="flex min-h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </fieldset>
    );
  },
  text: (field, form) => <NativeInput field={field} form={form} />,
  email: (field, form) => <NativeInput field={field} form={form} />,
  number: (field, form) => <NativeInput field={field} form={form} />,
  url: (field, form) => <NativeInput field={field} form={form} />,
  date: (field, form) => <NativeInput field={field} form={form} />,
  "datetime-local": (field, form) => <NativeInput field={field} form={form} />,
};

function NativeInput({ field, form }: { field: FieldDef; form: FormApi }) {
  return (
    <Input
      label={field.label}
      type={field.type ?? "text"}
      hint={field.hint}
      error={form.error(field.name)}
      {...form.getFieldProps(field.name)}
    />
  );
}

interface ResourceFormProps<S extends FormSchema> extends FormConfig<S> {
  submitLabel: string;
  onSubmit: (values: z.output<S>) => Promise<unknown>;
}

export function ResourceForm<S extends FormSchema>({
  schema,
  fields,
  initialValues,
  submitLabel,
  onSubmit,
}: ResourceFormProps<S>) {
  const form = useZodForm({ schema, initialValues, onSubmit: (values) => onSubmit(values) });
  return (
    <form noValidate onSubmit={form.handleSubmit} className="flex flex-col gap-4">
      {fields.map((field) => (
        <div key={field.name}>
          {FIELD_RENDERERS[field.type ?? "text"](field, form as unknown as FormApi)}
        </div>
      ))}
      <Button type="submit" loading={form.isSubmitting} className="self-end">
        {submitLabel}
      </Button>
    </form>
  );
}

export function useAdminCommand(resources: string[]) {
  const t = useTranslations("admin.common");
  const errorMessage = useErrorMessage();
  const mutation = useAdminMutation<MutationRequest>(resources, (request) => request);
  const run = async (request: MutationRequest, success = t("saved")): Promise<boolean> => {
    try {
      await mutation.mutateAsync(request);
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    }
  };
  return { run, isPending: mutation.isPending };
}

interface AdminResourceProps<T, C extends FormSchema, E extends FormSchema> {
  resource: string;
  path: string;
  title: string;
  columns: Column<T>[];
  rowKey?: (row: T) => string;
  rowLabel?: (row: T) => string;
  search?: string;
  filters?: Array<{ name: string; label: string; options: Option[] }>;
  query?: Query;
  baseUrl?: string;
  invalidate?: string[];
  create?: FormConfig<C> & { toBody?: (values: z.output<C>) => unknown };
  edit?: Omit<FormConfig<E>, "initialValues"> & {
    toValues: (row: T) => z.input<E>;
    toBody?: (values: z.output<E>, row: T) => unknown;
    path?: (row: T) => string;
    when?: (row: T) => boolean;
  };
  remove?: boolean | ((row: T) => boolean);
  actions?: (row: T, run: ReturnType<typeof useAdminCommand>["run"]) => ReactNode;
  toolbar?: ReactNode;
  empty?: string;
}

type Dialog<T> = { row?: T } | null;

export function AdminResource<
  T,
  C extends FormSchema = FormSchema,
  E extends FormSchema = FormSchema,
>(props: AdminResourceProps<T, C, E>) {
  const {
    resource,
    path,
    title,
    columns,
    search,
    filters = [],
    query = {},
    baseUrl,
    create,
    edit,
    remove,
    actions,
    toolbar,
    empty,
  } = props;
  const t = useTranslations("admin.common");
  const rowKey = props.rowKey ?? ((row: T) => (row as { id: string }).id);
  const rowLabel = props.rowLabel ?? rowKey;

  const [page, setPage] = useState(1);
  const [term, setTerm] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<Dialog<T>>(null);
  const debounced = useDebounce(term, 400);

  const list = useAdminList<T>(
    resource,
    path,
    { page, limit: 20, ...query, ...values, ...(search ? { [search]: debounced } : {}) },
    baseUrl
  );
  const command = useAdminCommand([resource, ...(props.invalidate ?? [])]);
  const withBase = (request: MutationRequest): MutationRequest =>
    baseUrl ? { ...request, baseUrl } : request;
  const idPath = (row: T) => `${path}/${encodeURIComponent(rowKey(row))}`;

  const onFilter = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  const onDelete = async (row: T) => {
    if (!window.confirm(t("confirmDelete", { name: rowLabel(row) }))) return;
    await command.run(withBase({ path: idPath(row), method: "DELETE" }), t("deleted"));
  };

  const canRemove = (row: T) => (typeof remove === "function" ? remove(row) : Boolean(remove));
  const allColumns: Column<T>[] =
    edit || remove || actions
      ? [
          ...columns,
          {
            key: "__actions",
            header: t("actions"),
            className: "text-right",
            cell: (row) => (
              <div className="flex flex-wrap justify-end gap-1">
                {actions?.(row, command.run)}
                {edit && (edit.when?.(row) ?? true) && (
                  <Button size="sm" variant="ghost" onClick={() => setDialog({ row })}>
                    {t("edit")}
                    <span className="sr-only"> {rowLabel(row)}</span>
                  </Button>
                )}
                {canRemove(row) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => void onDelete(row)}
                  >
                    {t("delete")}
                    <span className="sr-only"> {rowLabel(row)}</span>
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : columns;

  const submit = async (request: MutationRequest) => {
    if (await command.run(withBase(request))) setDialog(null);
  };

  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          {search && (
            <SearchField
              label={t("search")}
              value={term}
              onChange={(value) => (setTerm(value), setPage(1))}
            />
          )}
          {filters.map((filter) => (
            <SelectField
              key={filter.name}
              label={filter.label}
              value={values[filter.name] ?? ""}
              onChange={(event) => onFilter(filter.name, event.target.value)}
              options={[{ value: "", label: t("all") }, ...filter.options]}
              className="h-10"
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {toolbar}
          {create && <Button onClick={() => setDialog({})}>{t("new")}</Button>}
        </div>
      </div>

      <DataTable
        caption={title}
        columns={allColumns}
        rows={list.data?.data}
        rowKey={rowKey}
        loading={list.isFetching}
        meta={list.data?.meta}
        onPage={setPage}
        {...(empty ? { empty } : {})}
      />

      <Modal
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog?.row ? t("editTitle", { name: title }) : t("newTitle", { name: title })}
      >
        {dialog?.row && edit ? (
          <ResourceForm
            schema={edit.schema}
            fields={edit.fields}
            initialValues={edit.toValues(dialog.row)}
            submitLabel={t("save")}
            onSubmit={(formValues) =>
              submit({
                path: edit.path ? edit.path(dialog.row as T) : idPath(dialog.row as T),
                method: "PATCH",
                body: edit.toBody ? edit.toBody(formValues, dialog.row as T) : formValues,
              })
            }
          />
        ) : create ? (
          <ResourceForm
            schema={create.schema}
            fields={create.fields}
            initialValues={create.initialValues}
            submitLabel={t("create")}
            onSubmit={(formValues) =>
              submit({
                path,
                method: "POST",
                body: create.toBody ? create.toBody(formValues) : formValues,
              })
            }
          />
        ) : null}
      </Modal>
    </section>
  );
}

export function DialogButton({
  label,
  title,
  variant = "ghost",
  children,
}: {
  label: ReactNode;
  title: string;
  variant?: "ghost" | "secondary" | "primary";
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        {open && children(() => setOpen(false))}
      </Modal>
    </>
  );
}

interface FormActionProps<S extends FormSchema> extends FormConfig<S> {
  label: ReactNode;
  title: string;
  resources: string[];
  toRequest: (values: z.output<S>) => MutationRequest;
  submitLabel?: string;
  success?: string;
  variant?: "ghost" | "secondary" | "primary";
}

export function FormAction<S extends FormSchema>({
  label,
  title,
  resources,
  toRequest,
  submitLabel,
  success,
  variant,
  ...form
}: FormActionProps<S>) {
  const t = useTranslations("admin.common");
  const command = useAdminCommand(resources);
  return (
    <DialogButton label={label} title={title} {...(variant ? { variant } : {})}>
      {(close) => (
        <ResourceForm
          {...form}
          submitLabel={submitLabel ?? t("save")}
          onSubmit={async (values) => (await command.run(toRequest(values), success)) && close()}
        />
      )}
    </DialogButton>
  );
}

export function toOptions(
  values: readonly string[],
  label: (value: string) => string = (value) => value
): Option[] {
  return values.map((value) => ({ value, label: label(value) }));
}

export const isoOrUndefined = (value: string | undefined) =>
  value ? new Date(value).toISOString() : undefined;
