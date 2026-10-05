import { NotFoundException, UnprocessableException } from "../../../shared/filter/http-exception.filter";

export class WidgetNotFoundException extends NotFoundException {
  constructor(id: string) {
    super("Widget", id);
  }
}

export class WidgetLimitException extends UnprocessableException {
  constructor(max: number) {
    super(`Máximo ${max} widgets por panel`, "WIDGET_LIMIT_REACHED");
  }
}
