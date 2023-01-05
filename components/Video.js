import { StyleSheet, Text, View } from "react-native";
import React from "react";
import AppButton from "./AppButton";
import { RTCView } from "react-native-webrtc";

function ButtonContainer({ hangup }) {
  return (
    <View style={styles.bContainer}>
      <AppButton
        iconName="phone"
        backgroundColor="red"
        onPress={hangup}
      ></AppButton>
    </View>
  );
}

export default function Video({ hangup, localStream, remoteStream }) {
  // On call we will just display the local stream
  if (localStream && !remoteStream) {
    console.log("localStream && !remoteStream");
    return (
      <View style={styles.container}>
        <RTCView
          streamURL={localStream.toURL()}
          objectFit={"cover"}
          style={styles.video}
        ></RTCView>
        <ButtonContainer hangup={hangup}></ButtonContainer>
      </View>
    );
  }
  // Once the call is connected, we will display
  // local Stream on top of remote stream
  if (localStream && remoteStream) {
    return (
      <View style={styles.container}>
        <RTCView
          streamURL={remoteStream.toURL()}
          objectFit={"cover"}
          style={styles.video}
        ></RTCView>
        <RTCView
          streamURL={localStream.toURL()}
          objectFit={"cover"}
          style={styles.videoLocal}
        ></RTCView>
        <ButtonContainer hangup={hangup}></ButtonContainer>
      </View>
    );
  }
  return (
    <View>
      <ButtonContainer hangup={hangup}></ButtonContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  bContainer: {
    flexDirection: "row",
    bottom: 30,
  },
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  video: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  videoLocal: {
    position: "absolute",
    width: 100,
    height: 150,
    top: 0,
    left: 20,
    elevation: 10,
  },
});
