import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

// A centred, max-width reading column. On a phone the cap is wider than the
// screen so it's a no-op (full-bleed as before); on a tablet it keeps text and
// forms at a comfortable measure instead of stretching edge-to-edge, and centres
// them so the big canvas doesn't read as empty. Drop it inside a ScrollView's
// content (or any full-width parent) and put the screen's content inside it.
//
// Default cap (600) suits reading/form surfaces (job detail, post-a-job,
// paywall, analytics). Pass a wider `maxWidth` for grid-like surfaces.
const ContentColumn = ({
  children,
  maxWidth = 600,
  style,
}: {
  children: ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}) => (
  <View style={[{ width: '100%', maxWidth, alignSelf: 'center' }, style]}>
    {children}
  </View>
);

export default ContentColumn;
