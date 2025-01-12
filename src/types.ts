export interface VideoSubtitle {
  start: number; // start time (seconds)
  end: number; // end time (seconds)
  text: string; // content
}

export interface PlaylistItem {
  id: string;
  title: string;
  src: string;
  subtitleUrl?: string;
}
