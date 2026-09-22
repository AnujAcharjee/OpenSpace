"use client"

import { useCallback } from "react"
import axios from "axios"

import { roomsApiUrl } from "@/constants/apiUrls"
import type {
  AddRoomMembersRequest,
  CreateRoomInput,
  EditRoomRequest,
  GetPendingJoinRequestsRequest,
  RemoveRoomMemberRequest,
  RoomRecord,
  RoomJoinRequestRecord,
  RequestJoinRoomRequest,
  RespondJoinRequestRequest,
  SearchRoomsRequest,
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

type RequestJoinRoomResponse = {
  data?: {
    room?: RoomRecord | null
    joined?: boolean
    pending?: boolean
  }
  error?: string
  message?: string
}

type GetPendingJoinRequestsResponse = {
  data?: {
    requests?: RoomJoinRequestRecord[]
  }
  error?: string
  message?: string
}

type RespondJoinRequestResponse = {
  data?: {
    success?: boolean
    requestId?: string
    room?: RoomRecord | null
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
    async (name: SearchRoomsRequest["query"]["name"]) => {
      const res = await axios.get<{ data?: { rooms?: RoomRecord[] } }>(
        `${roomsApiUrl}/search`,
        {
          params: { name },
          withCredentials: true,
        }
      )

      return res.data.data?.rooms ?? []
    },
    []
  )

  const requestJoinRoom = useCallback(
    async (
      roomId: string,
      userId: RequestJoinRoomRequest["body"]["userId"]
    ) => {
      const res = await axios.post<RequestJoinRoomResponse>(
        `${roomsApiUrl}/${roomId}/join`,
        { userId },
        {
          withCredentials: true,
        }
      )

      return {
        room: res.data.data?.room ?? null,
        joined: res.data.data?.joined ?? false,
        pending: res.data.data?.pending ?? false,
      }
    },
    []
  )

  const getPendingJoinRequests = useCallback(
    async (
      roomId: string,
      actorUserId: GetPendingJoinRequestsRequest["query"]["actorUserId"]
    ) => {
      const res = await axios.get<GetPendingJoinRequestsResponse>(
        `${roomsApiUrl}/${roomId}/join-requests`,
        {
          params: { actorUserId },
          withCredentials: true,
        }
      )

      return res.data.data?.requests ?? []
    },
    []
  )

  const respondJoinRequest = useCallback(
    async (
      roomId: string,
      requestId: RespondJoinRequestRequest["params"]["requestId"],
      payload: RespondJoinRequestRequest["body"]
    ) => {
      const res = await axios.post<RespondJoinRequestResponse>(
        `${roomsApiUrl}/${roomId}/join-requests/${requestId}/respond`,
        payload,
        {
          withCredentials: true,
        }
      )

      return {
        success: res.data.data?.success ?? false,
        requestId: res.data.data?.requestId ?? requestId,
        room: res.data.data?.room ?? null,
      }
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

  return {
    createRoom,
    updateRoom,
    deleteRoom,
    leaveRoom,
    addMembers,
    removeMember,
    searchRooms,
    requestJoinRoom,
    getPendingJoinRequests,
    respondJoinRequest,
  }
}
