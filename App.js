import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  query,
  onSnapshot,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import {
  ScreenCapturePickerView,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals,
} from "react-native-webrtc";
import { db } from "./firebase";
import GettingCall from "./components/GettingCall";
import AppButton from "./components/AppButton";
import Video from "./components/Video";

const peerConstraints = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

function App() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [gettingCall, setGettingCall] = useState(false);
  const connecting = useRef(false);
  let pc = useRef(false);

  // Global state

  useEffect(() => {
    const cRef = doc(db, "meet", "chatId");
    const subscribe = onSnapshot(cRef, (snapshot) => {
      const data = snapshot.data();

      // On answer start the call
      if (pc.current && !pc.current.remoteDescription && data && data.answer) {
        pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }

      // if there is offer for chatId set the getting call flag
      if (data && data.offer && !connecting.current) {
        setGettingCall(true);
      }
    });

    // On Delete of collection call hangup
    // The other side has clicked on hangup
    const qdelete = query(collection(cRef, "callee"));
    const subscribeDelete = onSnapshot(qdelete, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type == "removed") {
          hangup();
        }
      });
    });
    return () => {
      subscribe();
      subscribeDelete();
    };
  }, []);

  async function setupWebrtc() {
    pc.current = new RTCPeerConnection(peerConstraints);

    // Get the audio and video stream for the call
    const stream = await getStream();

    if (stream) {
      setLocalStream(stream);
      pc.current.addStream(stream);
    }
    // Get the remote stream once it is available
    pc.current.onaddstream = (event) => {
      setRemoteStream(event.stream);
    };
  }

  async function create() {
    console.log("calling");
    connecting.current = true;

    // setUp webrtc
    await setupWebrtc();

    // Document for the call
    const cRef = doc(db, "meet", "chatId");
    // await setDoc(cRef, {});

    // Exchange the ICE candidates between the caller and callee
    collectIceCandidates(cRef, "caller", "callee");

    if (pc.current) {
      // Create the offer for the call
      // Store the offer under the document
      console.log("create");
      try {
        let sessionConstraints = {
          mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true,
            VoiceActivityDetection: true,
          },
        };
        const offerDescription = await pc.current.createOffer(
          sessionConstraints
        );
        await pc.current.setLocalDescription(offerDescription);

        const cWithOffer = {
          offer: {
            type: offerDescription.type,
            sdp: offerDescription.sdp,
          },
        };

        // cRef.set(cWithOffer)
        await setDoc(cRef, cWithOffer);
      } catch (error) {
        console.log("error", error);
      }
    }
  }

  const join = async () => {
    console.log("Joining the call");
    connecting.current = true;
    setGettingCall(false);

    //const cRef = firestore().collection("meet").doc("chatId")
    const cRef = doc(db, "meet", "chatId");
    // const offer = (await cRef.get()).data()?.offer
    const offer = (await getDoc(cRef)).data()?.offer;

    if (offer) {
      // Setup Webrtc
      await setupWebrtc();

      // Exchange the ICE candidates
      // Check the parameters, Its reversed. Since the joining part is callee
      collectIceCandidates(cRef, "callee", "caller");

      if (pc.current) {
        pc.current.setRemoteDescription(new RTCSessionDescription(offer));

        // Create the answer for the call
        // Updates the document with answer
        const answer = await pc.current.createAnswer();
        pc.current.setLocalDescription(answer);
        const cWithAnswer = {
          answer: {
            type: answer.type,
            sdp: answer.sdp,
          },
        };
        // cRef.update(cWithAnswer)
        await updateDoc(cRef, cWithAnswer);
      }
    }
  };

  /**
   * For disconnectign the call, close the connection, release the stream,
   * and delete the document for the call
   **/

  async function hangup() {
    console.log("hangup");
    setGettingCall(false);
    connecting.current = false;
    streamCleanUp();
    firebaseCleanUp();
    if (pc.current) {
      pc.current.close();
    }
  }

  // Helper function

  async function getStream() {
    let isVoiceOnly = false;
    let mediaConstraints = {
      audio: true,
      video: {
        frameRate: 30,
        facingMode: "user",
      },
    };
    try {
      const mediaStream = await mediaDevices.getUserMedia(mediaConstraints);

      if (isVoiceOnly) {
        let videoTrack = mediaStream.getVideoTracks()[0];
        videoTrack.enabled = false;
      }

      return mediaStream;
    } catch (err) {
      console.log("err", err);
    }
  }

  async function streamCleanUp() {
    console.log("streamCleanUp");
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream.release();
    }
    setLocalStream(null);
    setRemoteStream(null);
  }

  async function firebaseCleanUp() {
    console.log("firebaseCleanUp");
    const cRef = doc(db, "meet", "chatId");
    if (cRef) {
      const qee = query(collection(cRef, "callee"));
      const calleeCandidate = await getDocs(qee);
      calleeCandidate.forEach(async (candidate) => {
        await deleteDoc(candidate.ref);
      });
      const qer = query(collection(cRef, "caller"));
      const callerCandidate = await getDocs(qer);
      callerCandidate.forEach(async (candidate) => {
        await deleteDoc(candidate.ref);
      });
      deleteDoc(cRef);
    }
  }

  async function collectIceCandidates(cRef, localName, remoteName) {
    console.log("localName", localName);
    const candidateCollection = collection(db, "meet", "chatId", localName);

    if (pc.current) {
      // on new ICE candidate add it to firestore
      console.log("test");
      pc.current.onicecandidate = (event) => {
        event.candidate &&
          addDoc(candidateCollection, event.candidate.toJSON());
      };
    }

    // Get the ICE candidate added to firestore and update the local PC
    q = query(collection(cRef, remoteName));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type == "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.current.addIceCandidate(candidate);
        }
      });
    });
  }

  // Displays the gettingCall Component
  if (gettingCall) {
    console.log("gettingCall");
    return <GettingCall hangup={hangup} join={join}></GettingCall>;
  }

  // Displays local stream on calling
  // Displays both local and remote stream once call is connected
  if (localStream) {
    console.log("localStream");
    return (
      <Video
        hangup={hangup}
        localStream={localStream}
        remoteStream={remoteStream}
      ></Video>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <AppButton
          iconName="video"
          backgroundColor="grey"
          onPress={create}
        ></AppButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default App;
