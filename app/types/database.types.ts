export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            messages: {
                Row: {
                    id: number
                    room_id: number | null
                    user_id: number | null
                    event_id: number | null
                    chat_mode: string | null
                    history_is_visible: boolean | null
                    content: string
                    is_flagged: boolean | null
                    flag_reason: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    room_id?: number | null
                    user_id?: number | null
                    event_id?: number | null
                    chat_mode?: string | null
                    history_is_visible?: boolean | null
                    content: string
                    is_flagged?: boolean | null
                    flag_reason?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    room_id?: number | null
                    user_id?: number | null
                    event_id?: number | null
                    chat_mode?: string | null
                    history_is_visible?: boolean | null
                    content?: string
                    is_flagged?: boolean | null
                    flag_reason?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            users: {
                Row: {
                    id: number
                    supabase_user_id: string | null
                    name: string
                    email: string
                    is_admin: boolean | null
                    last_seen_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    supabase_user_id?: string | null
                    name: string
                    email: string
                    is_admin?: boolean | null
                    last_seen_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    supabase_user_id?: string | null
                    name?: string
                    email?: string
                    is_admin?: boolean | null
                    last_seen_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            events: {
                Row: {
                    id: number
                    name: string
                    status: string | null
                    show_chat_history: boolean | null
                    is_active: boolean | null
                    start_time: string | null
                    end_time: string | null
                    window_title: string | null
                    show_sponsored: boolean | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    name: string
                    status?: string | null
                    show_chat_history?: boolean | null
                    is_active?: boolean | null
                    start_time?: string | null
                    end_time?: string | null
                    window_title?: string | null
                    show_sponsored?: boolean | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    status?: string | null
                    show_chat_history?: boolean | null
                    is_active?: boolean | null
                    start_time?: string | null
                    end_time?: string | null
                    window_title?: string | null
                    show_sponsored?: boolean | null
                    created_at?: string
                    updated_at?: string
                }
            }
            rooms: {
                Row: {
                    id: number
                    name: string
                    slug: string
                    is_private: boolean | null
                    created_by: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    name: string
                    slug: string
                    is_private?: boolean | null
                    created_by?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    slug?: string
                    is_private?: boolean | null
                    created_by?: number | null
                    created_at?: string
                    updated_at?: string
                }
            }
            chat_settings: {
                Row: {
                    id: number
                    event_mode: string | null
                    is_chat_enabled: boolean | null
                    window_title: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    event_mode?: string | null
                    is_chat_enabled?: boolean | null
                    window_title?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    event_mode?: string | null
                    is_chat_enabled?: boolean | null
                    window_title?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
        }
    }
}
