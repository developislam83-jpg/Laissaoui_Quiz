import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export type PeerStatus = "connecting" | "connected" | "disconnected";

export interface ConnectedPeer {
  peerId: string;
  name: string;
  avatarUrl: string;
  status: PeerStatus;
  dataChannel?: RTCDataChannel;
}

export function useHostWebRTC(quizCode: string, onMessageReceived?: (peerId: string, msg: any) => void) {
  const [peers, setPeers] = useState<Record<string, ConnectedPeer>>({});
  const connectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceBuffersRef = useRef<Record<string, RTCIceCandidateInit[]>>({});

  // Keep callback fresh without recreating effect
  const callbackRef = useRef(onMessageReceived);
  useEffect(() => {
    callbackRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    if (!quizCode) return;

    // Join Signaling Channel
    const channel = supabase.channel(`quiz-${quizCode}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "peer-join-request" }, async ({ payload }) => {
      const { peerId, name, avatarUrl } = payload;
      
      iceBuffersRef.current[peerId] = [];

      // Initialize PeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      connectionsRef.current[peerId] = pc;

      // Create Data Channel
      const dataChannel = pc.createDataChannel("quizData", { negotiated: false });
      
      dataChannel.onopen = () => {
        setPeers(prev => ({ ...prev, [peerId]: { ...prev[peerId], status: "connected", dataChannel } }));
      };
      
      dataChannel.onclose = () => {
        setPeers(prev => ({ ...prev, [peerId]: { ...prev[peerId], status: "disconnected" } }));
      };

      dataChannel.onmessage = (event) => {
        if (callbackRef.current) {
          callbackRef.current(peerId, JSON.parse(event.data));
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: { target: peerId, candidate: event.candidate, from: "host" }
          });
        }
      };

      setPeers(prev => ({
        ...prev,
        [peerId]: { peerId, name, avatarUrl, status: "connecting" }
      }));

      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      channel.send({
        type: "broadcast",
        event: "offer",
        payload: { target: peerId, offer, from: "host" }
      });
    });

    channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
      const { target, answer } = payload;
      if (target !== "host") return; // Validate it's for host (though host implies target=host)
      
      const pc = connectionsRef.current[payload.from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        const buffer = iceBuffersRef.current[payload.from] || [];
        while (buffer.length > 0) {
          const candidate = buffer.shift();
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        }
      }
    });

    channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
      if (payload.target !== "host") return;
      const pc = connectionsRef.current[payload.from];
      if (pc && payload.candidate) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(console.error);
        } else {
          if (!iceBuffersRef.current[payload.from]) iceBuffersRef.current[payload.from] = [];
          iceBuffersRef.current[payload.from].push(payload.candidate);
        }
      }
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
      Object.values(connectionsRef.current).forEach(pc => pc.close());
    };
  }, [quizCode]);

  const broadcastMessage = (message: any) => {
    Object.values(peers).forEach(peer => {
      if (peer.status === "connected" && peer.dataChannel?.readyState === "open") {
        peer.dataChannel.send(JSON.stringify(message));
      }
    });
  };

  const removePeer = (peerId: string) => {
    const pc = connectionsRef.current[peerId];
    if (pc) {
      pc.close();
      delete connectionsRef.current[peerId];
    }
    setPeers(prev => {
      const newPeers = { ...prev };
      delete newPeers[peerId];
      return newPeers;
    });
  };

  return { peers: Object.values(peers), broadcastMessage, removePeer };
}
