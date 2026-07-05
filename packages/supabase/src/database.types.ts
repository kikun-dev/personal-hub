export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orbit_event_groups: {
        Row: {
          event_id: string
          group_id: string
          id: string
        }
        Insert: {
          event_id: string
          group_id: string
          id?: string
        }
        Update: {
          event_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_event_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "orbit_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_event_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "orbit_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_event_members: {
        Row: {
          event_id: string
          id: string
          member_id: string
        }
        Insert: {
          event_id: string
          id?: string
          member_id: string
        }
        Update: {
          event_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "orbit_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_event_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "orbit_members"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_event_types: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      orbit_events: {
        Row: {
          created_at: string
          date: string
          description: string
          end_date: string | null
          event_type_id: string
          id: string
          is_member_history: boolean
          start_time: string | null
          title: string
          updated_at: string
          url: string | null
          venue: string | null
        }
        Insert: {
          created_at?: string
          date: string
          description?: string
          end_date?: string | null
          event_type_id: string
          id?: string
          is_member_history?: boolean
          start_time?: string | null
          title: string
          updated_at?: string
          url?: string | null
          venue?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          end_date?: string | null
          event_type_id?: string
          id?: string
          is_member_history?: boolean
          start_time?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orbit_events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "orbit_event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_group_penlight_colors: {
        Row: {
          created_at: string
          group_id: string
          hex: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          group_id: string
          hex: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          group_id?: string
          hex?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "orbit_group_penlight_colors_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "orbit_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_groups: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          is_catchall: boolean
          max_generation: number
          name_en: string | null
          name_ja: string
          sort_order: number
          successor_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_catchall?: boolean
          max_generation?: number
          name_en?: string | null
          name_ja: string
          sort_order?: number
          successor_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_catchall?: boolean
          max_generation?: number
          name_en?: string | null
          name_ja?: string
          sort_order?: number
          successor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_groups_successor_id_fkey"
            columns: ["successor_id"]
            isOneToOne: false
            referencedRelation: "orbit_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_live_attendances: {
        Row: {
          attended_type: string
          created_at: string
          id: string
          note: string | null
          performance_id: string
          seat_note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attended_type: string
          created_at?: string
          id?: string
          note?: string | null
          performance_id: string
          seat_note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attended_type?: string
          created_at?: string
          id?: string
          note?: string | null
          performance_id?: string
          seat_note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_live_attendances_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "orbit_live_performances"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_live_performance_absences: {
        Row: {
          id: string
          member_id: string
          note: string | null
          performance_id: string
        }
        Insert: {
          id?: string
          member_id: string
          note?: string | null
          performance_id: string
        }
        Update: {
          id?: string
          member_id?: string
          note?: string | null
          performance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_live_performance_absences_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "orbit_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_live_performance_absences_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "orbit_live_performances"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_live_performances: {
        Row: {
          created_at: string
          doors_open_at: string | null
          has_live_viewing: boolean
          has_streaming: boolean
          id: string
          live_id: string
          performance_date: string | null
          sort_order: number
          starts_at: string | null
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          doors_open_at?: string | null
          has_live_viewing?: boolean
          has_streaming?: boolean
          id?: string
          live_id: string
          performance_date?: string | null
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          doors_open_at?: string | null
          has_live_viewing?: boolean
          has_streaming?: boolean
          id?: string
          live_id?: string
          performance_date?: string | null
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orbit_live_performances_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "orbit_lives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_live_performances_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "orbit_venues"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_live_performer_groups: {
        Row: {
          group_id: string
          id: string
          live_id: string
        }
        Insert: {
          group_id: string
          id?: string
          live_id: string
        }
        Update: {
          group_id?: string
          id?: string
          live_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_live_performer_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "orbit_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_live_performer_groups_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "orbit_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_live_performer_members: {
        Row: {
          id: string
          live_id: string
          member_id: string
        }
        Insert: {
          id?: string
          live_id: string
          member_id: string
        }
        Update: {
          id?: string
          live_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_live_performer_members_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "orbit_lives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_live_performer_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "orbit_members"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_lives: {
        Row: {
          created_at: string
          description: string | null
          id: string
          live_type: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          live_type: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          live_type?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      orbit_member_groups: {
        Row: {
          created_at: string
          generation: string | null
          graduated_at: string | null
          group_id: string
          id: string
          joined_at: string | null
          member_id: string
        }
        Insert: {
          created_at?: string
          generation?: string | null
          graduated_at?: string | null
          group_id: string
          id?: string
          joined_at?: string | null
          member_id: string
        }
        Update: {
          created_at?: string
          generation?: string | null
          graduated_at?: string | null
          group_id?: string
          id?: string
          joined_at?: string | null
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_member_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "orbit_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_member_groups_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "orbit_members"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_member_sns: {
        Row: {
          created_at: string
          display_name: string
          hashtag: string | null
          id: string
          member_id: string
          sns_type: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          display_name: string
          hashtag?: string | null
          id?: string
          member_id: string
          sns_type: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          display_name?: string
          hashtag?: string | null
          id?: string
          member_id?: string
          sns_type?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_member_sns_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "orbit_members"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_members: {
        Row: {
          blog_hashtag: string | null
          blog_url: string | null
          blood_type: string | null
          call_name: string | null
          created_at: string
          date_of_birth: string | null
          height_cm: number | null
          hometown: string | null
          id: string
          image_url: string | null
          memo: string | null
          name_en: string | null
          name_ja: string
          name_kana: string
          penlight_color_1: string | null
          penlight_color_2: string | null
          talk_app_hashtag: string | null
          talk_app_name: string | null
          talk_app_url: string | null
          updated_at: string
          zodiac: string | null
        }
        Insert: {
          blog_hashtag?: string | null
          blog_url?: string | null
          blood_type?: string | null
          call_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          height_cm?: number | null
          hometown?: string | null
          id?: string
          image_url?: string | null
          memo?: string | null
          name_en?: string | null
          name_ja: string
          name_kana: string
          penlight_color_1?: string | null
          penlight_color_2?: string | null
          talk_app_hashtag?: string | null
          talk_app_name?: string | null
          talk_app_url?: string | null
          updated_at?: string
          zodiac?: string | null
        }
        Update: {
          blog_hashtag?: string | null
          blog_url?: string | null
          blood_type?: string | null
          call_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          height_cm?: number | null
          hometown?: string | null
          id?: string
          image_url?: string | null
          memo?: string | null
          name_en?: string | null
          name_ja?: string
          name_kana?: string
          penlight_color_1?: string | null
          penlight_color_2?: string | null
          talk_app_hashtag?: string | null
          talk_app_name?: string | null
          talk_app_url?: string | null
          updated_at?: string
          zodiac?: string | null
        }
        Relationships: []
      }
      orbit_people: {
        Row: {
          biography: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string
          id: string
          roles: string[]
          updated_at: string
        }
        Insert: {
          biography?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name: string
          id?: string
          roles?: string[]
          updated_at?: string
        }
        Update: {
          biography?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          id?: string
          roles?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      orbit_release_bonus_videos: {
        Row: {
          created_at: string
          description: string | null
          edition: string
          id: string
          release_id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          edition: string
          id?: string
          release_id: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          edition?: string
          id?: string
          release_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_release_bonus_videos_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "orbit_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_release_member_positions: {
        Row: {
          created_at: string
          id: string
          is_front_special: boolean
          is_hiatus: boolean
          member_id: string
          release_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_front_special?: boolean
          is_hiatus?: boolean
          member_id: string
          release_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_front_special?: boolean
          is_hiatus?: boolean
          member_id?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_release_member_positions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "orbit_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_release_member_positions_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "orbit_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_release_members: {
        Row: {
          created_at: string
          id: string
          member_id: string
          release_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          release_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_release_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "orbit_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_release_members_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "orbit_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_release_tracks: {
        Row: {
          created_at: string
          id: string
          release_id: string
          track_id: string
          track_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          release_id: string
          track_id: string
          track_number: number
        }
        Update: {
          created_at?: string
          id?: string
          release_id?: string
          track_id?: string
          track_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "orbit_release_tracks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "orbit_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_release_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "orbit_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_releases: {
        Row: {
          artwork_path: string | null
          artwork_person_id: string | null
          created_at: string
          group_id: string
          id: string
          numbering: number | null
          release_date: string | null
          release_type: string
          title: string
          updated_at: string
        }
        Insert: {
          artwork_path?: string | null
          artwork_person_id?: string | null
          created_at?: string
          group_id: string
          id?: string
          numbering?: number | null
          release_date?: string | null
          release_type: string
          title: string
          updated_at?: string
        }
        Update: {
          artwork_path?: string | null
          artwork_person_id?: string | null
          created_at?: string
          group_id?: string
          id?: string
          numbering?: number | null
          release_date?: string | null
          release_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_releases_artwork_person_id_fkey"
            columns: ["artwork_person_id"]
            isOneToOne: false
            referencedRelation: "orbit_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_releases_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "orbit_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_setlist_item_formation_members: {
        Row: {
          created_at: string
          formation_row_id: string
          id: string
          member_id: string
          slot_order: number
        }
        Insert: {
          created_at?: string
          formation_row_id: string
          id?: string
          member_id: string
          slot_order: number
        }
        Update: {
          created_at?: string
          formation_row_id?: string
          id?: string
          member_id?: string
          slot_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "orbit_setlist_item_formation_members_formation_row_id_fkey"
            columns: ["formation_row_id"]
            isOneToOne: false
            referencedRelation: "orbit_setlist_item_formation_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_setlist_item_formation_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "orbit_members"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_setlist_item_formation_rows: {
        Row: {
          created_at: string
          id: string
          member_count: number
          row_number: number
          setlist_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_count: number
          row_number: number
          setlist_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_count?: number
          row_number?: number
          setlist_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_setlist_item_formation_rows_setlist_item_id_fkey"
            columns: ["setlist_item_id"]
            isOneToOne: false
            referencedRelation: "orbit_setlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_setlist_item_members: {
        Row: {
          id: string
          is_center: boolean
          member_id: string
          setlist_item_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_center?: boolean
          member_id: string
          setlist_item_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_center?: boolean
          member_id?: string
          setlist_item_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "orbit_setlist_item_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "orbit_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_setlist_item_members_setlist_item_id_fkey"
            columns: ["setlist_item_id"]
            isOneToOne: false
            referencedRelation: "orbit_setlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_setlist_items: {
        Row: {
          costume_note: string | null
          created_at: string
          id: string
          item_type: string
          note: string | null
          performance_id: string
          performance_style: string | null
          performance_styles: string[]
          position: number
          section: string
          song_title: string | null
          track_id: string | null
        }
        Insert: {
          costume_note?: string | null
          created_at?: string
          id?: string
          item_type: string
          note?: string | null
          performance_id: string
          performance_style?: string | null
          performance_styles?: string[]
          position: number
          section?: string
          song_title?: string | null
          track_id?: string | null
        }
        Update: {
          costume_note?: string | null
          created_at?: string
          id?: string
          item_type?: string
          note?: string | null
          performance_id?: string
          performance_style?: string | null
          performance_styles?: string[]
          position?: number
          section?: string
          song_title?: string | null
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orbit_setlist_items_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "orbit_live_performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_setlist_items_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "orbit_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_spot_appearance_members: {
        Row: {
          appearance_id: string
          created_at: string
          id: string
          member_id: string
        }
        Insert: {
          appearance_id: string
          created_at?: string
          id?: string
          member_id: string
        }
        Update: {
          appearance_id?: string
          created_at?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_spot_appearance_members_appearance_id_fkey"
            columns: ["appearance_id"]
            isOneToOne: false
            referencedRelation: "orbit_spot_appearances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_spot_appearance_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "orbit_members"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_spot_appearances: {
        Row: {
          appeared_on: string | null
          created_at: string
          event_id: string | null
          id: string
          link_url: string | null
          live_id: string | null
          note: string | null
          series_name: string | null
          source_type: string
          spot_id: string
          track_id: string | null
          video_id: string | null
        }
        Insert: {
          appeared_on?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          link_url?: string | null
          live_id?: string | null
          note?: string | null
          series_name?: string | null
          source_type: string
          spot_id: string
          track_id?: string | null
          video_id?: string | null
        }
        Update: {
          appeared_on?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          link_url?: string | null
          live_id?: string | null
          note?: string | null
          series_name?: string | null
          source_type?: string
          spot_id?: string
          track_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orbit_spot_appearances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "orbit_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_spot_appearances_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "orbit_lives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_spot_appearances_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "orbit_spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_spot_appearances_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "orbit_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_spot_appearances_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "orbit_track_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_spot_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_path: string
          sort_order: number
          spot_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_path: string
          sort_order?: number
          spot_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_path?: string
          sort_order?: number
          spot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_spot_photos_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "orbit_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_spots: {
        Row: {
          address: string | null
          category: string
          created_at: string
          description: string | null
          google_maps_url: string | null
          google_place_id: string | null
          id: string
          latitude: number
          longitude: number
          name: string
          prefecture: string | null
        }
        Insert: {
          address?: string | null
          category: string
          created_at?: string
          description?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          id?: string
          latitude: number
          longitude: number
          name: string
          prefecture?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          description?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          prefecture?: string | null
        }
        Relationships: []
      }
      orbit_track_costumes: {
        Row: {
          created_at: string
          id: string
          image_path: string
          note: string | null
          sort_order: number
          stylist_person_id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_path: string
          note?: string | null
          sort_order?: number
          stylist_person_id: string
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string
          note?: string | null
          sort_order?: number
          stylist_person_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_track_costumes_stylist_person_id_fkey"
            columns: ["stylist_person_id"]
            isOneToOne: false
            referencedRelation: "orbit_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_track_costumes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "orbit_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_track_credits: {
        Row: {
          created_at: string
          credit_role: string
          id: string
          person_id: string
          sort_order: number
          track_id: string
        }
        Insert: {
          created_at?: string
          credit_role: string
          id?: string
          person_id: string
          sort_order?: number
          track_id: string
        }
        Update: {
          created_at?: string
          credit_role?: string
          id?: string
          person_id?: string
          sort_order?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_track_credits_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "orbit_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_track_credits_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "orbit_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_track_formation_members: {
        Row: {
          created_at: string
          formation_row_id: string
          id: string
          is_center: boolean
          member_id: string
          slot_order: number
        }
        Insert: {
          created_at?: string
          formation_row_id: string
          id?: string
          is_center?: boolean
          member_id: string
          slot_order: number
        }
        Update: {
          created_at?: string
          formation_row_id?: string
          id?: string
          is_center?: boolean
          member_id?: string
          slot_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "orbit_track_formation_members_formation_row_id_fkey"
            columns: ["formation_row_id"]
            isOneToOne: false
            referencedRelation: "orbit_track_formation_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_track_formation_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "orbit_members"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_track_formation_rows: {
        Row: {
          created_at: string
          formation_id: string
          id: string
          member_count: number
          row_number: number
        }
        Insert: {
          created_at?: string
          formation_id: string
          id?: string
          member_count: number
          row_number: number
        }
        Update: {
          created_at?: string
          formation_id?: string
          id?: string
          member_count?: number
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "orbit_track_formation_rows_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "orbit_track_formations"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_track_formations: {
        Row: {
          column_count: number
          created_at: string
          id: string
          track_id: string
          updated_at: string
        }
        Insert: {
          column_count: number
          created_at?: string
          id?: string
          track_id: string
          updated_at?: string
        }
        Update: {
          column_count?: number
          created_at?: string
          id?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_track_formations_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "orbit_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_track_mvs: {
        Row: {
          created_at: string
          director_person_id: string | null
          id: string
          location: string | null
          memo: string | null
          mv_url: string
          published_on: string | null
          track_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          director_person_id?: string | null
          id?: string
          location?: string | null
          memo?: string | null
          mv_url: string
          published_on?: string | null
          track_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          director_person_id?: string | null
          id?: string
          location?: string | null
          memo?: string | null
          mv_url?: string
          published_on?: string | null
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_track_mvs_director_person_id_fkey"
            columns: ["director_person_id"]
            isOneToOne: false
            referencedRelation: "orbit_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orbit_track_mvs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "orbit_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_track_videos: {
        Row: {
          created_at: string
          id: string
          memo: string | null
          published_on: string | null
          track_id: string
          updated_at: string
          video_type: string
          video_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          memo?: string | null
          published_on?: string | null
          track_id: string
          updated_at?: string
          video_type: string
          video_url: string
        }
        Update: {
          created_at?: string
          id?: string
          memo?: string | null
          published_on?: string | null
          track_id?: string
          updated_at?: string
          video_type?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_track_videos_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "orbit_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_tracks: {
        Row: {
          artist_name: string | null
          created_at: string
          generation: string | null
          group_id: string
          id: string
          label: string | null
          note: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist_name?: string | null
          created_at?: string
          generation?: string | null
          group_id: string
          id?: string
          label?: string | null
          note?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist_name?: string | null
          created_at?: string
          generation?: string | null
          group_id?: string
          id?: string
          label?: string | null
          note?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orbit_tracks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "orbit_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      orbit_venues: {
        Row: {
          access: string | null
          capacity: number | null
          created_at: string
          id: string
          map_url: string | null
          name: string
          notes: string | null
          official_url: string | null
          prefecture: string | null
          updated_at: string
        }
        Insert: {
          access?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          map_url?: string | null
          name: string
          notes?: string | null
          official_url?: string | null
          prefecture?: string | null
          updated_at?: string
        }
        Update: {
          access?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          map_url?: string | null
          name?: string
          notes?: string | null
          official_url?: string | null
          prefecture?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          activity_type: string | null
          amount: number
          category_id: string | null
          created_at: string
          date: string
          group_name: string | null
          id: string
          is_oshikatsu: boolean
          memo: string
          payment_method_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          date: string
          group_name?: string | null
          id?: string
          is_oshikatsu?: boolean
          memo?: string
          payment_method_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          group_name?: string | null
          id?: string
          is_oshikatsu?: boolean
          memo?: string
          payment_method_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_release_with_relations: {
        Args: {
          p_artwork_path: string
          p_artwork_person_name: string
          p_bonus_videos: Json
          p_group_id: string
          p_member_ids: string[]
          p_numbering: number
          p_release_date: string
          p_release_type: string
          p_title: string
          p_track_links: Json
        }
        Returns: string
      }
      create_track_with_relations_v2: {
        Args: {
          p_costumes: Json
          p_credits: Json
          p_formation_rows: Json
          p_generation: string
          p_group_id: string
          p_label: string
          p_mv: Json
          p_release_links: Json
          p_title: string
          p_videos: Json
        }
        Returns: string
      }
      find_birthday_member_ids_by_date: {
        Args: { target_day: number; target_month: number }
        Returns: string[]
      }
      find_birthday_member_ids_by_month: {
        Args: { target_month: number }
        Returns: string[]
      }
      find_event_ids_on_this_day: {
        Args: { target_day: number; target_month: number }
        Returns: string[]
      }
      find_orbit_birthdays_by_date: {
        Args: { target_day: number; target_month: number }
        Returns: {
          date_of_birth: string
          group_names: string[]
          id: string
          name_ja: string
        }[]
      }
      find_orbit_birthdays_by_month: {
        Args: { target_month: number }
        Returns: {
          date_of_birth: string
          group_names: string[]
          id: string
          name_ja: string
        }[]
      }
      find_orbit_events_on_this_day: {
        Args: { target_day: number; target_month: number }
        Returns: {
          date: string
          end_date: string
          event_type_color: string
          event_type_id: string
          event_type_name: string
          group_ids: string[]
          group_names: string[]
          id: string
          is_member_history: boolean
          start_time: string
          title: string
          venue: string
        }[]
      }
      has_orbit_read_role: { Args: never; Returns: boolean }
      is_orbit_admin: { Args: never; Returns: boolean }
      replace_performance_setlist: {
        Args: { p_payload: Json; p_performance_id: string }
        Returns: undefined
      }
      set_release_member_positions: {
        Args: { p_positions: Json; p_release_id: string }
        Returns: undefined
      }
      set_track_centers: {
        Args: { p_center_member_ids: Json; p_track_id: string }
        Returns: undefined
      }
      update_event_with_relations: {
        Args: {
          p_date: string
          p_description: string
          p_end_date: string
          p_event_id: string
          p_event_type_id: string
          p_group_ids: string[]
          p_is_member_history: boolean
          p_member_ids: string[]
          p_start_time: string
          p_title: string
          p_url: string
          p_venue: string
        }
        Returns: undefined
      }
      update_member_with_relations: {
        Args: {
          p_blog_hashtag: string
          p_blog_url: string
          p_blood_type: string
          p_call_name: string
          p_date_of_birth: string
          p_groups: Json
          p_height_cm: number
          p_hometown: string
          p_image_url: string
          p_member_id: string
          p_memo: string
          p_name_en: string
          p_name_ja: string
          p_name_kana: string
          p_penlight_color_1: string
          p_penlight_color_2: string
          p_sns: Json
          p_talk_app_hashtag: string
          p_talk_app_name: string
          p_talk_app_url: string
          p_zodiac: string
        }
        Returns: undefined
      }
      update_release_with_relations: {
        Args: {
          p_artwork_path: string
          p_artwork_person_name: string
          p_bonus_videos: Json
          p_group_id: string
          p_member_ids: string[]
          p_numbering: number
          p_release_date: string
          p_release_id: string
          p_release_type: string
          p_title: string
          p_track_links: Json
        }
        Returns: undefined
      }
      update_track_with_relations: {
        Args: {
          p_costumes: Json
          p_credits: Json
          p_formation_rows: Json
          p_mv: Json
          p_release_links: Json
          p_title: string
          p_track_id: string
        }
        Returns: undefined
      }
      update_track_with_relations_v2: {
        Args: {
          p_costumes: Json
          p_credits: Json
          p_formation_rows: Json
          p_generation: string
          p_group_id: string
          p_label: string
          p_mv: Json
          p_release_links: Json
          p_title: string
          p_track_id: string
          p_videos: Json
        }
        Returns: undefined
      }
      upsert_orbit_live: {
        Args: { p_id: string; p_payload: Json }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
