// AdminResource.tsx (Client Components: React + TanStack Query + Formik/Zod) => bloque CRUD genérico del panel admin.
// Cada recurso (proveedores, cupones, campañas, webhooks...) solo DECLARA columnas, filtros y campos; este archivo pone
// el listado paginado, la búsqueda con debounce, el diálogo crear/editar, el borrado con confirmación y los avisos.
// Patrones: Template Method (estructura fija, piezas variables por props), Strategy (render de cada tipo de campo:
// tabla FIELD_RENDERERS), Command (MutationRequest describe la petición) y Composite (columnas/campos como datos).
// Paradigma: declarativo + funcional (props inmutables). Principios: DRY (≈15 recursos con un solo componente),
// OCP (un tipo de campo nuevo = una entrada en FIELD_RENDERERS), SRP (los datos viven en dashboard.api).
// Ahorro: debounce de 400 ms (menos peticiones) y solo se monta el formulario cuando el diálogo está abierto.
"use client"; // Directiva de Next.js: este módulo usa estado y eventos => se ejecuta en el navegador

// "import type" (TypeScript) => importa solo tipos: no agrega bytes al bundle de JavaScript
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl"; // next-intl: textos en el idioma activo
import { getIn } from "formik"; // Formik: lee valores anidados ("variants.0.sku") de forma segura
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

// ---------- Tipos (TypeScript) ----------

// "export type" => alias reutilizable por todas las secciones
export type Option = { value: string; label: string };

// FormSchema => el mismo tipo de schema que acepta useZodForm (derivado: si cambia el hook, cambia aquí; DRY)
type FormSchema = Parameters<typeof useZodForm>[0]["schema"];
// FormApi => objeto que devuelve useZodForm (valores, errores, getFieldProps...) para un schema cualquiera
type FormApi = ReturnType<typeof useZodForm<FormSchema>>;

// FieldDef => descripción declarativa de un campo del formulario ("interface" => contrato de forma)
export interface FieldDef {
  name: string; // Clave en los valores del formulario (igual a la del schema Zod)
  label: string; // Texto visible y nombre accesible
  // Unión de literales => solo se admiten estos tipos (error de compilación con cualquier otro)
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
  options?: ReadonlyArray<Option>; // Para "select" y "checkboxes"
  hint?: string; // Ayuda bajo el campo (aria-describedby)
}

// FormConfig<S> => genérico: schema + campos + valores iniciales del MISMO schema (tipado de punta a punta)
export interface FormConfig<S extends FormSchema> {
  schema: S;
  fields: FieldDef[];
  initialValues: z.input<S>;
}

// ---------- Formulario declarativo ----------

// FIELD_RENDERERS => Strategy: cada tipo de campo sabe dibujarse; "Record<K, V>" obliga a cubrir todos los tipos
const FIELD_RENDERERS: Record<
  NonNullable<FieldDef["type"]>,
  (field: FieldDef, form: FormApi) => ReactNode
> = {
  // "{...form.getFieldProps(name)}" => name/value/onChange/onBlur conectados a Formik en una línea
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
  // checkbox => booleano: "checked" en lugar de "value" (control nativo: accesible sin JavaScript extra)
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
  // checkboxes => selección múltiple (arreglo de strings) agrupada en <fieldset> + <legend> (WCAG 1.3.1)
  checkboxes: (field, form) => {
    const selected: string[] = getIn(form.values, field.name) ?? []; // "??" => valor por defecto si es undefined/null
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
  // Los tipos nativos de <input> comparten el mismo control (DRY): el navegador aporta teclado y selector de fecha
  text: (field, form) => <NativeInput field={field} form={form} />,
  email: (field, form) => <NativeInput field={field} form={form} />,
  number: (field, form) => <NativeInput field={field} form={form} />,
  url: (field, form) => <NativeInput field={field} form={form} />,
  date: (field, form) => <NativeInput field={field} form={form} />,
  "datetime-local": (field, form) => <NativeInput field={field} form={form} />,
};

// NativeInput => <input> accesible de shared/ui (label, error traducido, aria-invalid)
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
  onSubmit: (values: z.output<S>) => Promise<unknown>; // Recibe los valores YA transformados por Zod
}

// ResourceForm => formulario completo a partir de la configuración (Formik + Zod vía useZodForm)
export function ResourceForm<S extends FormSchema>({
  schema,
  fields,
  initialValues,
  submitLabel,
  onSubmit,
}: ResourceFormProps<S>) {
  const form = useZodForm({ schema, initialValues, onSubmit: (values) => onSubmit(values) });
  return (
    // "noValidate" => sin burbujas nativas del navegador: los errores los muestra Zod de forma accesible y traducida
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

// ---------- Mutaciones con avisos (hook reutilizable) ----------

// useAdminCommand => ejecuta un MutationRequest, muestra el aviso de éxito/error e invalida SOLO los recursos dados.
// Devuelve una función async que nunca rechaza (los formularios no quedan con promesas sin capturar).
export function useAdminCommand(resources: string[]) {
  const t = useTranslations("admin.common");
  const errorMessage = useErrorMessage();
  // Identidad: la entrada YA es la petición (Command); el hook genérico se encarga del token y la invalidación
  const mutation = useAdminMutation<MutationRequest>(resources, (request) => request);
  const run = async (request: MutationRequest, success = t("saved")): Promise<boolean> => {
    try {
      await mutation.mutateAsync(request);
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(errorMessage(error)); // Mensaje traducido por código de error del backend
      return false;
    }
  };
  return { run, isPending: mutation.isPending };
}

// ---------- Recurso CRUD completo ----------

// "interface ... <T, C, E>" => genéricos: T = fila del listado, C/E = schemas de crear/editar
interface AdminResourceProps<T, C extends FormSchema, E extends FormSchema> {
  resource: string; // Clave de caché ["admin", resource]
  path: string; // Endpoint REST del listado (ej. "/supplier")
  title: string; // Título de la sección y nombre accesible de la tabla
  columns: Column<T>[];
  rowKey?: (row: T) => string; // Por defecto "row.id"
  rowLabel?: (row: T) => string; // Nombre de la fila para lectores de pantalla ("Editar Acme S.A.")
  search?: string; // Parámetro de búsqueda del backend ("q", "to", "action"); sin valor => sin buscador
  filters?: Array<{ name: string; label: string; options: Option[] }>; // Selects con opción "Todos"
  query?: Query; // Parámetros fijos del listado
  baseUrl?: string; // Otro backend con el mismo contrato (FastAPI)
  invalidate?: string[]; // Otros recursos que cambian con estas mutaciones (ej. inventario -> KPIs)
  create?: FormConfig<C> & { toBody?: (values: z.output<C>) => unknown };
  edit?: Omit<FormConfig<E>, "initialValues"> & {
    toValues: (row: T) => z.input<E>;
    toBody?: (values: z.output<E>, row: T) => unknown;
    path?: (row: T) => string;
    when?: (row: T) => boolean;
  };
  remove?: boolean | ((row: T) => boolean); // true => botón eliminar (DELETE path/:id)
  actions?: (row: T, run: ReturnType<typeof useAdminCommand>["run"]) => ReactNode; // Acciones extra por fila
  toolbar?: ReactNode; // Botones extra junto a "Nuevo"
  empty?: string;
}

// Dialog => estado del diálogo: cerrado (null), crear ({}) o editar ({ row })
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
  // "as" => aserción: por convención todos los recursos del backend exponen "id"
  const rowKey = props.rowKey ?? ((row: T) => (row as { id: string }).id);
  const rowLabel = props.rowLabel ?? rowKey;

  // Estado local de la vista (useState: no se comparte con otras pantallas => no va a Redux)
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<Dialog<T>>(null);
  const debounced = useDebounce(term, 400); // Espera a que el usuario deje de escribir

  // Spread condicional: el parámetro de búsqueda solo viaja si hay buscador y texto
  const list = useAdminList<T>(
    resource,
    path,
    { page, limit: 20, ...query, ...values, ...(search ? { [search]: debounced } : {}) },
    baseUrl
  );
  const command = useAdminCommand([resource, ...(props.invalidate ?? [])]);
  const withBase = (request: MutationRequest): MutationRequest =>
    baseUrl ? { ...request, baseUrl } : request;
  const idPath = (row: T) => `${path}/${encodeURIComponent(rowKey(row))}`; // encodeURIComponent: IDs con "/" (Cloudinary)

  // onFilter => cambia un filtro y vuelve a la página 1 (la página 3 de otro filtro podría no existir)
  const onFilter = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  const onDelete = async (row: T) => {
    // "window.confirm" => diálogo nativo del navegador: accesible por teclado y lector de pantalla, 0 KB de JS extra
    if (!window.confirm(t("confirmDelete", { name: rowLabel(row) }))) return;
    await command.run(withBase({ path: idPath(row), method: "DELETE" }), t("deleted"));
  };

  // Columna de acciones: solo si hay algo que hacer por fila (editar, eliminar o acciones propias)
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

  // submit => crea (POST path) o edita (PATCH path/:id); cierra el diálogo solo si salió bien
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

      {/* El formulario solo existe con el diálogo abierto (no se crean estados Formik ocultos) */}
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

// ---------- Acciones con diálogo (detalle o formulario propio) ----------

// DialogButton => botón que abre un diálogo; el contenido es una FUNCIÓN (render prop) que solo se ejecuta abierto
// (lazy: las consultas del detalle no se disparan hasta que el usuario lo pide) y recibe "close" para cerrarse
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

// FormAction => DialogButton + ResourceForm + comando: acciones como "registrar movimiento" o "enviar correo"
interface FormActionProps<S extends FormSchema> extends FormConfig<S> {
  label: ReactNode;
  title: string;
  resources: string[]; // Recursos a invalidar al terminar
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

// ---------- Utilidades de presentación compartidas ----------

// toOptions => ["A", "B"] -> [{ value: "A", label: t("A") }] (Factory de opciones traducidas; DRY en todas las secciones)
export function toOptions(
  values: readonly string[],
  label: (value: string) => string = (value) => value
): Option[] {
  return values.map((value) => ({ value, label: label(value) }));
}

// isoOrUndefined => "2026-10-05T10:00" (hora local del navegador) -> ISO UTC que entiende el backend
export const isoOrUndefined = (value: string | undefined) =>
  value ? new Date(value).toISOString() : undefined;
