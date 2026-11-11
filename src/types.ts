export type TemplateKind = "schedule" | "pricing" | "event";
export type LayoutKind = "editorial" | "airy";
export type PosterHeight = 1080 | 1440 | 1920;
export interface Course {
  id: string;
  day: number;
  time: string;
  endTime: string;
  name: string;
  teacher: string;
  room: string;
}
export interface Price {
  id: string;
  category: string;
  name: string;
  single: string;
  packagePrice: string;
  sessions: string;
  offer: string;
  validity: string;
  note: string;
}
export interface EventInfo {
  subtitle: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: string;
  teacher: string;
  registration: string;
}
export interface Design {
  scheduleStyle?: ScheduleStyle;
  id: string;
  kind: TemplateKind;
  name: string;
  title: string;
  dateRange: string;
  note: string;
  demo: boolean;
  height: PosterHeight;
  layout: LayoutKind;
  backgroundId: string | null;
  logoId: string | null;
  photoId: string | null;
  qrId: string | null;
  mist: number;
  cropX: number;
  cropY: number;
  courses: Course[];
  prices: Price[];
  event: EventInfo;
  updatedAt: number;
}
export interface MaterialState {
  version: 1;
  projects: Design[];
  activeId: string;
  previous: Record<string, Design>;
}
export type AssetKind = "background" | "logo" | "photo" | "qr";
export interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  blob: Blob;
  noPeople: boolean;
  createdAt: number;
}
export interface AssetView extends Omit<Asset, "blob"> {
  url: string;
}
export interface RenderResult {
  overflowReason?: string;
  overflow: boolean;
  error?: string;
  bodyFont: number;
  contentBottom: number;
}
export interface ScheduleStyle {
  mode: "auto" | "manual";
  fontSize: number;
  courseWidth: number;
  rowGap: number;
}
