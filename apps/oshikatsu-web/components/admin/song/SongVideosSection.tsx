"use client";

import type { CreateSongVideoInput, SongVideoType } from "@/types/song";
import { SONG_VIDEO_TYPE_LABELS } from "@/types/song";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

type SongVideosSectionProps = {
  videos: Record<SongVideoType, CreateSongVideoInput>;
  visibleVideos: Record<SongVideoType, boolean>;
  dancePracticeVideoLabel: string | null;
  errors: Record<string, string>;
  setVideoFormVisible: (type: SongVideoType, isVisible: boolean) => void;
  updateVideo: (type: SongVideoType, field: keyof CreateSongVideoInput, value: string) => void;
  clearVideo: (type: SongVideoType) => void;
};

export function SongVideosSection({
  videos,
  visibleVideos,
  dancePracticeVideoLabel,
  errors,
  setVideoFormVisible,
  updateVideo,
  clearVideo,
}: SongVideosSectionProps) {
  const renderVideoForm = (type: SongVideoType, label: string) => {
    const video = videos[type];
    const isVisible = visibleVideos[type];

    return (
      <div key={type}>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/70">{label}</label>
          {!isVisible ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setVideoFormVisible(type, true)}
            >
              + {label}を追加
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => clearVideo(type)}>
              {label}を削除
            </Button>
          )}
        </div>

        {isVisible ? (
          <div className="space-y-3 rounded-lg border border-foreground/10 p-4">
            <Input
              id={`song-video-${type}-url`}
              label={`${label}リンク`}
              value={video.url}
              onChange={(e) => updateVideo(type, "url", e.target.value)}
              error={errors[`videos.${type}.url`]}
            />
            <Input
              id={`song-video-${type}-published-on`}
              label="配信日"
              type="date"
              value={video.publishedOn}
              onChange={(e) => updateVideo(type, "publishedOn", e.target.value)}
              error={errors[`videos.${type}.publishedOn`]}
            />
            <Textarea
              id={`song-video-${type}-memo`}
              label={`${label}メモ`}
              value={video.memo}
              onChange={(e) => updateVideo(type, "memo", e.target.value)}
              error={errors[`videos.${type}.memo`]}
            />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-foreground/15 py-4 text-center text-xs text-foreground/40">
            {label}は未設定です
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {dancePracticeVideoLabel &&
        renderVideoForm("dance_practice", dancePracticeVideoLabel)}
      {renderVideoForm("call", SONG_VIDEO_TYPE_LABELS.call)}
    </div>
  );
}
