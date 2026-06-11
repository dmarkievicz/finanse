/** Domyślne pola kont tworzonych podczas importu (opcja A). */
export const IMPORTED_ACCOUNT_DEFAULTS = {
  is_active: false,
  lifecycle_status: "archived" as const,
  show_on_dashboard: false,
  include_in_net_worth: false,
  needs_review: true,
};

/** Pola przy ręcznej aktywacji konta przez użytkownika. */
export const ACTIVE_ACCOUNT_DEFAULTS = {
  is_active: true,
  lifecycle_status: "active" as const,
  show_on_dashboard: true,
  include_in_net_worth: true,
  needs_review: false,
};
