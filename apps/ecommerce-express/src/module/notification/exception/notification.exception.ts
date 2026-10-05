import { NotFoundException } from "../../../shared/filter/http-exception.filter";

export class NotificationNotFoundException extends NotFoundException {
  constructor(id: string) {
    super("Notification", id);
  }
}
