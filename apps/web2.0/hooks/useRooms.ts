"use client"

import { useCallback } from "react"
import axios from "axios"

import { roomsApiUrl } from "@/constants/apiUrls"
import type {
  AddRoomMembersRequest,
  CreateRoomInput,
  EditRoomRequest,
  RemoveRoomMemberRequest,
  RoomRecord,
} from "@repo/validation"

type RoomResponse = {
  data?: {
    room?: RoomRecord
  }
  error?: string
  message?: string
}

type DeleteRoomResponse = {
  data?: {
    id?: string
  }
  error?: string
  message?: string
}

type AddRoomMembersResponse = {
  data?: {
    room?: RoomRecord
    addedCount?: number
  }
  error?: string
  message?: string
}

type RemoveRoomMemberResponse = {
  data?: {
    room?: RoomRecord
    id?: string
  }
  error?: string
  message?: string
}

export const useRooms = () => {
  const createRoom = useCallback(async (payload: CreateRoomInput) => {
    const res = await axios.post<RoomResponse>(roomsApiUrl, payload, {
      withCredentials: true,
    })
    const room = res.data.data?.room

    if (!room) {
      throw new Error("Room was not returned")
    }

    return room
  }, [])

  const createDirectRoom = useCallback(async (participantId: string) => {
    const res = await axios.post<RoomResponse>(
      `${roomsApiUrl}/direct`,
      { participantId },
      { withCredentials: true }
    )
    const room = res.data.data?.room
    if (!room) throw new Error("Direct room was not returned")
    return room
  }, [])

  const createGroupRoom = useCallback(
    async (payload: {
      name: string
      description?: string
      avatarUrl?: string | null
      memberUsernames?: string[]
    }) => {
      const res = await axios.post<RoomResponse>(
        `${roomsApiUrl}/group`,
        payload,
        { withCredentials: true }
      )
      const room = res.data.data?.room
      if (!room) throw new Error("Group room was not returned")
      return room
    },
    []
  )

  const updateRoom = useCallback(
    async (roomId: string, payload: EditRoomRequest["body"]) => {
      const res = await axios.patch<RoomResponse>(
        `${roomsApiUrl}/${roomId}`,
        payload,
        {
          withCredentials: true,
        }
      )
      const room = res.data.data?.room

      if (!room) {
        throw new Error("Room was not returned")
      }

      return room
    },
    []
  )

  const deleteRoom = useCallback(async (roomId: string) => {
    const res = await axios.delete<DeleteRoomResponse>(
      `${roomsApiUrl}/${roomId}`,
      {
        withCredentials: true,
      }
    )
    const deletedRoomId = res.data.data?.id

    if (!deletedRoomId) {
      throw new Error("Room was not returned")
    }

    return deletedRoomId
  }, [])

  const addMembers = useCallback(
    async (
      roomId: string,
      usernames: AddRoomMembersRequest["body"]["usernames"]
    ) => {
      const res = await axios.post<AddRoomMembersResponse>(
        `${roomsApiUrl}/${roomId}/members`,
        { usernames },
        {
          withCredentials: true,
        }
      )
      const room = res.data.data?.room

      if (!room) {
        throw new Error("Room was not returned")
      }

      return {
        room,
        addedCount: res.data.data?.addedCount ?? 0,
      }
    },
    []
  )

  const removeMember = useCallback(
    async (
      roomId: string,
      memberId: RemoveRoomMemberRequest["params"]["memberId"]
    ) => {
      const res = await axios.delete<RemoveRoomMemberResponse>(
        `${roomsApiUrl}/${roomId}/members/${memberId}`,
        {
          withCredentials: true,
        }
      )
      const room = res.data.data?.room

      if (!room) {
        throw new Error("Room was not returned")
      }

      return {
        room,
        id: res.data.data?.id ?? memberId,
      }
    },
    []
  )

  const searchRooms = useCallback(
    async (
      params?: {
        name?: string
        page?: number
        limit?: number
      } | string
    ) => {
      const queryParams = typeof params === "string" ? { name: params } : params
      const res = await axios.get<{
        data?: {
          rooms?: RoomRecord[]
          hasMore?: boolean
          page?: number
          total?: number
        }
      }>(
        `${roomsApiUrl}/search`,
        {
          params: queryParams,
          withCredentials: true,
        }
      )

      const rooms = res.data.data?.rooms ?? []
      const hasMore = Boolean(res.data.data?.hasMore)
      const total = res.data.data?.total ?? rooms.length
      const page = res.data.data?.page ?? 1

      return Object.assign([...rooms], {
        hasMore,
        total,
        page,
        rooms,
      })
    },
    []
  )

  const leaveRoom = useCallback(async (roomId: string, userId?: string) => {
    const res = await axios.post<{
      data?: {
        room?: RoomRecord | null
        roomId?: string
        userId?: string
      }
      error?: string
      message?: string
    }>(
      `${roomsApiUrl}/${roomId}/leave`,
      { userId },
      {
        withCredentials: true,
      }
    )

    return res.data.data
  }, [])

  const updateMemberRole = useCallback(
    async (roomId: string, memberId: string, role: "ADMIN" | "MEMBER" | "OWNER") => {
      const res = await axios.patch<{
        data?: { room?: RoomRecord; memberId?: string; role?: string }
      }>(
        `${roomsApiUrl}/${roomId}/members/${memberId}`,
        { role },
        { withCredentials: true }
      )
      return res.data.data?.room ?? null
    },
    []
  )

  return {
    createRoom,
    createDirectRoom,
    createGroupRoom,
    updateRoom,
    deleteRoom,
    leaveRoom,
    updateMemberRole,
    addMembers,
    removeMember,
    searchRooms,
  }
}
