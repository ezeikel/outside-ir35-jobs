import { useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

// A minimal brand-styled slider built on gesture-handler + reanimated (already
// in the native build — no new native dependency, so no prebuild needed). Used
// by the take-home calculator for the salary and dividend levers. Reports the
// value continuously on drag via onChange; the owner holds the value.

type Props = {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
};

const THUMB = 20;
const TRACK_H = 6;
const VERIFIED = '#1f5d43';
const TRACK_BG = '#e8e7e5';

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

const Slider = ({ min, max, step = 1, value, onChange }: Props) => {
  const [width, setWidth] = useState(0);
  const usable = Math.max(1, width - THUMB);
  const range = Math.max(1, max - min);

  // Thumb x-position (px) for the current value.
  const posX = useSharedValue(0);
  // Recompute the thumb position whenever value/width change (controlled).
  const ratio = clamp((value - min) / range, 0, 1);
  posX.value = ratio * usable;

  const startX = useSharedValue(0);

  // Convert a pixel position to a stepped value and report it.
  const report = (px: number) => {
    const r = clamp(px / usable, 0, 1);
    const raw = min + r * range;
    const stepped = Math.round(raw / step) * step;
    onChange(clamp(stepped, min, max));
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = posX.value;
    })
    .onUpdate((e) => {
      const next = clamp(startX.value + e.translationX, 0, usable);
      posX.value = next;
      runOnJS(report)(next);
    });

  // Tap anywhere on the track to jump the thumb there.
  const tap = Gesture.Tap().onEnd((e) => {
    const next = clamp(e.x - THUMB / 2, 0, usable);
    posX.value = next;
    runOnJS(report)(next);
  });

  const gesture = Gesture.Simultaneous(pan, tap);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: posX.value }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: posX.value + THUMB / 2,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        className="justify-center"
        style={{ height: THUMB + 12 }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {/* Track */}
        <View
          style={{
            height: TRACK_H,
            borderRadius: TRACK_H / 2,
            backgroundColor: TRACK_BG,
          }}
        >
          {/* Filled portion */}
          <Animated.View
            style={[
              {
                height: TRACK_H,
                borderRadius: TRACK_H / 2,
                backgroundColor: VERIFIED,
              },
              fillStyle,
            ]}
          />
        </View>
        {/* Thumb */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: VERIFIED,
              borderWidth: 2,
              borderColor: '#ffffff',
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 3,
            },
            thumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
};

export default Slider;
