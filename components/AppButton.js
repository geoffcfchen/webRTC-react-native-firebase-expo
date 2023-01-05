import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";

function AppButton({ iconName, backgroundColor, onPress, style }) {
  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.button, style, { backgroundColor: backgroundColor }]}
      >
        <Icon name={iconName} color="white" size={20}></Icon>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 60,
    height: 60,
    padding: 10,
    elevation: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 100,
  },
});

export default AppButton;
