import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export function usePeerWebRTC(quizCode: string, peerId: string, name: string, avatarUrl: string) {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Expose a callback for incoming messages
  const onMessageRef = useRef<((data: any) => void) | null>(null);

  useEffect(() => {
    if (!quizCode || !peerId) return;

    const channel = supabase.channel(`quiz-${quizCode}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { target: "host", candidate: event.candidate, from: peerId }
        });
      }
    };

    pc.ondatachannel = (event) => {
      const dataChannel = event.channel;
      dcRef.current = dataChannel;
      
      dataChannel.onopen = () => setStatus("connected");
      dataChannel.onclose = () => setStatus("disconnected");
      dataChannel.onmessage = (msgEvent) => {
        if (onMessageRef.current) {
          onMessageRef.current(JSON.parse(msgEvent.data));
        }
      };
    };

    channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
      if (payload.target !== peerId) return;

      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      channel.send({
        type: "broadcast",
        event: "answer",
        payload: { target: "host", answer, from: peerId }
      });
    });

    channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
      if (payload.target !== peerId) return;
      if (payload.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Send join request to host
        channel.send({
          type: "broadcast",
          event: "peer-join-request",
          payload: { peerId, name, avatarUrl }
        });
      }
    });

    return () => {
      channel.unsubscribe();
      pc.close();
    };
  }, [quizCode, peerId]);

  const sendMessage = (message: any) => {
    if (dcRef.current?.readyState === "open") {
      dcRef.current.send(JSON.stringify(message));
    }
  };

  const setOnMessage = (callback: (data: any) => void) => {
    onMessageRef.current = callback;
  };

  return { status, sendMessage, setOnMessage };
}
