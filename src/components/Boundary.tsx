import { Touch } from "./Visuals";
import React from "react";
import { View, Text } from "react-native";
import { ui } from "./ui";
export class Boundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <View style={[ui.card, { margin: 24 }]}>
        <Text style={ui.heading}>This screen could not continue.</Text>
        <Text style={ui.text}>
          Your saved learning progress is preserved. Retrying restarts the
          current screen and any virtual table session.
        </Text>
        <Touch
          accessibilityRole="button"
          style={ui.button}
          onPress={() => this.setState({ failed: false })}
        >
          <Text style={ui.text}>Retry application</Text>
        </Touch>
      </View>
    ) : (
      this.props.children
    );
  }
}
