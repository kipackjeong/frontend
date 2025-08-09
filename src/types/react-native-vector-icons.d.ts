declare module 'react-native-vector-icons/Feather' {
  import { Component } from 'react';
  import { TextStyle, ViewStyle } from 'react-native';

  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle | ViewStyle;
    onPress?: () => void;
    [key: string]: any;
  }

  export default class Icon extends Component<IconProps> {}
}
