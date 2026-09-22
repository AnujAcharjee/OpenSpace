/**
 * WS Client
 * each client (browser) should have only single running instance
 *
 */

import {
  type IssueTicketRequest,
  type IssueTicketResponse,
  type WsMessage,
} from "@repo/validation"
import axios from "axios"
import { handlers } from "./handlers"
import { usersApiUrl } from "@/constants/apiUrls"

const wsUrl: string = process.env.NEXT_PUBLIC_WS_SRV_URL || "ws://localhost:3002"
type WsTicketUser = IssueTicketRequest["body"]

class Ws {
  #ws: WebSocket | null = null
  #maxReconnectAttempts: number = 20
  #reconnectAttempts: number = 0
  #reconnectTimeout = 10_000

  constructor() {}

  #reconnect(user: WsTicketUser) {
    if (this.#reconnectAttempts >= this.#maxReconnectAttempts) {
      console.error("Max re-connection attempts reached. Stopped re-trying.")
      return
    }

    this.#reconnectAttempts++

    const delay = Math.min(
      1000 * 2 ** this.#reconnectAttempts,
      this.#reconnectTimeout
    )

    setTimeout(() => {
      this.connect(user)
    }, delay)
  }

  isOpen() {
    return this.#ws?.readyState === WebSocket.OPEN
  }

  async connect(user: WsTicketUser) {
    if (this.#ws && this.#ws.readyState === WebSocket.CONNECTING) {
      return
    }

    // close the running ws before re-connoting
    if (this.#ws && this.isOpen()) {
      this.#ws.close(1000, "Reconnecting")
    }

    // get ws ticket
    let ticket: string | null = null
    try {
      const res = await axios.post<IssueTicketResponse>(
        `${usersApiUrl}/ws-ticket`,
        user,
        {
          withCredentials: true,
        }
      )

      ticket = res.data.ticket
    } catch {
      this.#reconnect(user)
      return
    }

    this.#ws = new WebSocket(`${wsUrl}?ticket=${ticket}`)

    // event listeners
    this.#ws.onopen = () => {
      this.#reconnectAttempts = 0
    }

    this.#ws.onmessage = (event) => {
      try {
        const data: WsMessage = JSON.parse(event.data)
        const { type, payload } = data

        const handler = handlers[type]
        if (handler) handler(payload)
      } catch (error) {
        console.error("Invalid JSON message:", error)
      }
    }

    this.#ws.onerror = (error) => {
      console.error("WS error : ", error)
    }

    this.#ws.onclose = (event) => {
      this.#ws = null

      // avoid reconnect on intentional close
      if (event.code !== 1000) {
        this.#reconnect(user)
      }
    }
  }

  send(data: WsMessage | { type: string; [key: string]: any }) {
    if (this.#ws && this.isOpen()) {
      this.#ws.send(JSON.stringify(data))
    }
  }

  joinRoom(roomId: string) {
    this.send({ type: "join_room", roomId })
  }

  leaveRoom(roomId: string) {
    this.send({ type: "leave_room", roomId })
  }

  close() {
    if (!this.#ws) return

    this.#ws.onopen = null
    this.#ws.onmessage = null
    this.#ws.onclose = null
    this.#ws.onerror = null

    if (this.isOpen() || this.#ws.readyState === WebSocket.CONNECTING) {
      this.#ws.close(1000, "WS connection closed")
    }

    this.#ws = null
    this.#reconnectAttempts = 0
  }
}

export const wsClient = new Ws()
