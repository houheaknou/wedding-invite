import type { Dict } from "@/lib/i18n";

/**
 * The dictionary entries each client component uses [review M-6]. Server pages pass
 * `pick(t, X_KEYS)` instead of the whole ~420-entry dictionary, which React would otherwise
 * serialise into every page's HTML. TypeScript checks the lists: a component reading an entry
 * that is not in its list (incl. `t[`cat_${c}`]` lookups) fails to compile.
 *
 * Shared by server pages (values) and client components (types) — keep it free of server code.
 */

type Key = keyof Dict;
const keys = <const K extends readonly Key[]>(...k: K) => k;

export const AUTH_KEYS = keys(
  "emailOrPhone",
  "hidePassword",
  "login",
  "name",
  "passwordHint",
  "passwordLabel",
  "register",
  "showPassword",
);
export type AuthDict = Pick<Dict, (typeof AUTH_KEYS)[number]>;

export const ACCOUNT_KEYS = keys(
  "changePassword",
  "changePasswordHint",
  "confirmPassword",
  "currentPassword",
  "email",
  "hidePassword",
  "name",
  "newPassword",
  "passwordChanged",
  "passwordHint",
  "phone",
  "profileHint",
  "profileTitle",
  "save",
  "saved",
  "setPassword",
  "setPasswordHint",
  "showPassword",
);
export type AccountDict = Pick<Dict, (typeof ACCOUNT_KEYS)[number]>;

export const EVENT_FORM_KEYS = keys(
  "address",
  "agenda",
  "agendaHint",
  "back",
  "brideName",
  "bridePlaceholder",
  "coverPhoto",
  "date",
  "eventName",
  "eventNamePlaceholder",
  "eventType",
  "eventType_BIRTHDAY",
  "eventType_ENGAGEMENT",
  "eventType_OTHER",
  "eventType_WEDDING",
  "groomName",
  "groomPlaceholder",
  "mapLink",
  "notes",
  "notesPlaceholder",
  "removePhoto",
  "time",
  "uploadPhoto",
  "venue",
  "venuePlaceholder",
);
export type EventFormDict = Pick<Dict, (typeof EVENT_FORM_KEYS)[number]>;

export const GUEST_FORM_KEYS = keys(
  "addGuest",
  "back",
  "group",
  "groupPlaceholder",
  "invitedCount",
  "name",
  "notes",
  "phone",
  "save",
  "side",
  "side_BOTH",
  "side_BRIDE",
  "side_GROOM",
  "status",
  "status_CONFIRMED",
  "status_DECLINED",
  "status_INVITED",
  "status_PENDING",
);
export type GuestFormDict = Pick<Dict, (typeof GUEST_FORM_KEYS)[number]>;

export const GUEST_PICKER_KEYS = keys(
  "clear",
  "giftAlreadyGiven",
  "giftFromPlaceholder",
  "giftNewName",
  "giftNotOnList",
  "giftOnGuestList",
  "giftPickGuest",
  "side_BOTH",
  "side_BRIDE",
  "side_GROOM",
);
export type GuestPickerDict = Pick<Dict, (typeof GUEST_PICKER_KEYS)[number]>;

export const GIFT_FORMS_KEYS = keys(
  ...GUEST_PICKER_KEYS,
  "addGift",
  "currencyDollar",
  "currencyRiel",
  "giftAmount",
  "giftCurrencyType",
  "giftFrom",
  "giftPayType",
  "giftSaved",
  "giftSideAuto",
  "method_BANK",
  "method_CASH",
  "method_OTHER",
  "notes",
  "save",
  "side",
);
export type GiftFormsDict = Pick<Dict, (typeof GIFT_FORMS_KEYS)[number]>;

export const EXPENSE_FORMS_KEYS = keys(
  "add",
  "budget",
  "budgetHint",
  "cat_ATTIRE",
  "cat_CEREMONY",
  "cat_DECOR",
  "cat_FOOD",
  "cat_INVITATION",
  "cat_MUSIC",
  "cat_OTHER",
  "cat_PHOTO",
  "cat_TRANSPORT",
  "cat_VENUE",
  "currencyHint",
  "currency_KHR",
  "currency_USD",
  "expenseAmount",
  "expenseCategory",
  "expenseCurrency",
  "expenseDue",
  "expenseGroup",
  "expenseGroupPlaceholder",
  "expensePaid",
  "expensePaidHint",
  "expenseQuantity",
  "expenseTitle",
  "expenseTitlePlaceholder",
  "expenseUnitPrice",
  "expenseVendor",
  "expenseVendorPlaceholder",
  "notes",
  "save",
);
export type ExpenseFormsDict = Pick<Dict, (typeof EXPENSE_FORMS_KEYS)[number]>;

export const IMPORT_FORM_KEYS = keys(
  "downloadTemplate",
  "import",
  "importHelp",
);
export type ImportFormDict = Pick<Dict, (typeof IMPORT_FORM_KEYS)[number]>;

export const GALLERY_KEYS = keys(
  "addPhotos",
  "delete",
  "galleryFull",
  "galleryHint",
  "galleryTitle",
  "uploading",
);
export type GalleryDict = Pick<Dict, (typeof GALLERY_KEYS)[number]>;

export const TEMPLATE_EDITOR_KEYS = keys(
  "musicUploading",
  "errMusicUpload",
  ...GALLERY_KEYS,
  "address",
  "bActivity",
  "bAddDay",
  "bAddItem",
  "bBrideEn",
  "bBrideKm",
  "bBrideParentsEn",
  "bBrideParentsKm",
  "bBridePhoto",
  "bBuilder",
  "bBuilderHint",
  "bDay",
  "bDayDate",
  "bDayTitle",
  "bDesignSettings",
  "bGiftAccountName",
  "bGiftAccountNo",
  "bGiftBank",
  "bGiftHint",
  "bGiftKhr",
  "bGiftQrImage",
  "bGiftUsd",
  "bGroomEn",
  "bGroomKm",
  "bGroomParentsEn",
  "bGroomParentsKm",
  "bGroomPhoto",
  "bHeadBasic",
  "bHeadCouple",
  "bHeadDesign",
  "bHeadGift",
  "bHeadProgramme",
  "bHeadVenue",
  "bLivePreview",
  "bLivePreviewHint",
  "bMessageKm",
  "bParentsHint",
  "bPreviewLink",
  "bQrCropped",
  "bQrNotFound",
  "bRemove",
  "bSaveAndPreview",
  "bShowGiftQr",
  "bShowMap",
  "bShowParents",
  "bShowProgramme",
  "bShowRsvp",
  "bShowVenue",
  "bTabBasic",
  "bTabCouple",
  "bTabDesign",
  "bTabGift",
  "bTabProgramme",
  "bTabVenue",
  "bThemeColor",
  "bTime",
  "bTitleEn",
  "bTitleKm",
  "bUpload",
  "bVenueEn",
  "bVenueKm",
  "bVenuePhoto",
  "bWeddingDate",
  "bWeddingTime",
  "bgImage",
  "bg_custom",
  "bg_damask",
  "bg_floral",
  "bg_lattice",
  "bg_paper",
  "bg_peach",
  "bg_plain",
  "bg_temple",
  "colorBottom",
  "colorOutline",
  "colorTop",
  "contactPhones",
  "copied",
  "copy",
  "coverPhoto",
  "fontStyle",
  "font_sans",
  "font_serif",
  "guestLinkHint",
  "invitationLanguage",
  "lunarDate",
  "mapLink",
  "menuDesc_footer",
  "menuDesc_gallery",
  "menuDesc_gift",
  "menuDesc_home",
  "menuDesc_invitation",
  "menuDesc_programme",
  "menuDesc_rsvp",
  "menuDesc_venue",
  "music",
  "musicHint",
  "noMusic",
  "openLink",
  "previewLinkHint",
  "publish",
  "removeMusic",
  "resetColors",
  "sectionsMenu",
  "shareLink",
  "shareTelegram",
  "showCountdown",
  "showTitle",
  "templates",
  "tgInviteText",
  "uploadMusic",
  "uploadOwnImage",
);
export type TemplateEditorDict = Pick<
  Dict,
  (typeof TEMPLATE_EDITOR_KEYS)[number]
>;

export const TEMPLATE_STORE_KEYS = keys(
  "close",
  "storeEdit",
  "storeFree",
  "storeGuests",
  "storeHint",
  "storeInUse",
  "storeTitle",
  "storeUse",
  "storeView",
);
export type TemplateStoreDict = Pick<
  Dict,
  (typeof TEMPLATE_STORE_KEYS)[number]
>;

const cache = new WeakMap<Dict, Map<readonly Key[], Partial<Dict>>>();

/**
 * Just these entries of `t`. Cached per dictionary and key list, so a page that renders the same
 * form many times (one per row) passes one shared object, which React serialises once.
 */
export function pick<K extends Key>(t: Dict, k: readonly K[]): Pick<Dict, K> {
  let byKeys = cache.get(t);
  if (!byKeys) cache.set(t, (byKeys = new Map()));
  let picked = byKeys.get(k);
  if (!picked) {
    picked = Object.fromEntries(k.map((key) => [key, t[key]])) as Partial<Dict>;
    byKeys.set(k, picked);
  }
  return picked as Pick<Dict, K>;
}
