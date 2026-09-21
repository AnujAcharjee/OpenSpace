"use client"

import { useCallback } from "react"
import axios from "axios"

import { chatApiUrl } from "@/constants/apiUrls"
import type { CreateMessageInput } from "@repo/validation"

export type ChatHistoryMessage = {
  id: string
  type: string
  userId: string
  roomId: string
  text?: string
  attachments?: string
  parentId?: string
  parent?: {
    id: string
    text?: string
    senderUsername?: string
    isDeleted?: boolean
  }
  isDeleted: boolean
  modifiedAt?: string
  createdAt: string
  updatedAt: string
  senderUsername: string
  senderAvatarUrl?: string
}

type ChatHistoryResponse = {
  data?: {
    roomId?: string
    messages?: ChatHistoryMessage[]
  }
}

type CreateMessageResponse = {
  data?: {
    message?: ChatHistoryMessage
  }
  error?: string
  message?: string
}

type DeleteMessageResponse = {
  data?: {
    success?: boolean
    id?: string
  }
  error?: string
  message?: string
}

export const useMessage = () => {
  const fetchMessages = useCallback(async (roomId: string, userId: string) => {
    const res = await axios.get<ChatHistoryResponse>(
      `${chatApiUrl}/rooms/${roomId}/messages`,
      {
        params:{
          limit: 50,
        },
        withCredentials: true,
      }
    )

    return res.data.data?.messages ?? []
  }, [])

  const createMessage = useCallback(
    async (payload: CreateMessageInput["body"]) => {
      const res = await axios.post<CreateMessageResponse>(
        `${chatApiUrl}/messages`,
        payload,
        {
          withCredentials: true,
        }
      )

      const message = res.data.data?.message

      if (!message) {
        throw new Error("Message was not returned")
      }

      return message
    },
    []
  )

  const deleteMessage = useCallback(async (messageId: string) => {
    const res = await axios.delete<DeleteMessageResponse>(
      `${chatApiUrl}/messages/${messageId}`,
      {
        withCredentials: true,
      }
    )

    return res.data.data
  }, [])

  return {
    createMessage,
    deleteMessage,
    fetchMessages,
  }
}
