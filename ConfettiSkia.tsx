import {
  Canvas,
  Image,
  Rect,
  SkiaValue,
  Transforms2d,
  useClockValue,
  useComputedValue,
  useImage,
} from '@shopify/react-native-skia';
import {random, range, sample} from 'lodash';
import React, {useMemo, useState} from 'react';
import {
  ImageRequireSource,
  LayoutRectangle,
  StyleSheet,
  Image as RNImage,
} from 'react-native';

type ConfettiSkiaConfig = {
  colors: string[];
  images: ImageRequireSource[];
  count: number;
  delayRange: [number, number];
  xSpawnRange: [number, number];
  ySpawnRange: [number, number];
  ascendingDurationRange: [number, number];
  ascendingXOffsetRange: [number, number];
  hoveringDurationRange: [number, number];
  descendingDurationRange: [number, number];
};

const defaultConfig: ConfettiSkiaConfig = {
  colors: ['#22e39e', '#ed4e4e', '#fea134', '#ff8fd8', '#5c59f3'],
  images: [
    require('./assets/confetti1.png'),
    require('./assets/confetti2.png'),
    require('./assets/confetti3.png'),
    require('./assets/confetti4.png'),
  ],
  count: 50,
  delayRange: [0, 0],
  xSpawnRange: [0.4, 0.6],
  ySpawnRange: [0.5, 0.5],
  ascendingDurationRange: [500, 600],
  ascendingXOffsetRange: [-200, 200],
  hoveringDurationRange: [200, 200],
  descendingDurationRange: [2000, 6000],
};

type ConfettiSkiaProps = {
  config?: Partial<ConfettiSkiaConfig>;
};

export const ConfettiSkia = ({config}: ConfettiSkiaProps) => {
  const resolvedConfig = {...defaultConfig, config};
  const [layout, setLayout] = useState<LayoutRectangle>();
  const clock = useClockValue();

  const totalDuration =
    resolvedConfig.ascendingDurationRange[1] +
    resolvedConfig.hoveringDurationRange[1] +
    resolvedConfig.descendingDurationRange[1];

  const time = useComputedValue(
    () => clock.current % totalDuration,
    [clock, totalDuration],
  );

  return (
    <Canvas
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={e => setLayout(e.nativeEvent.layout)}>
      {layout &&
        range(resolvedConfig.count).map(index => (
          <Confetti
            key={index}
            time={time}
            containerLayout={layout}
            config={resolvedConfig}
          />
        ))}
    </Canvas>
  );
};

const Confetti = ({
  containerLayout,
  time,
  config,
}: {
  time: SkiaValue<number>;
  containerLayout: LayoutRectangle;
  config: ConfettiSkiaConfig;
}) => {
  const {width: containerWidth, height: containerHeight} = containerLayout;
  const animationProps = useMemo(
    () => getAnimationPropsForConfetti(containerWidth, containerHeight, config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const style = useComputedValue(() => {
    const {
      delay,
      startX,
      startY,
      ascendingDuration,
      ascendingXOffset,
      ascendingYTarget,
      hoveringDuration,
      hoveringAmplitude,
      descendingDuration,
      descendingSpeedX,
      descendingSpeedY,
      descendingRandomFactor,
      rotationVelocity,
      scale,
    } = animationProps;

    // Easing/interpolate functions.
    // These functions are inline for better performance: moving them to separate worklets increase
    // the number of JSI round trips which causes framedrops given the large number of animated confettis
    function easeInOutCubic(x: number): number {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }
    function easeOutQuart(x: number): number {
      return 1 - Math.pow(1 - x, 4);
    }
    function fastInterpolate(
      x: number,
      inputRange: [number, number],
      outputRange: [number, number],
    ) {
      const t = Math.min(
        Math.max((x - inputRange[0]) / (inputRange[1] - inputRange[0]), 0),
        1,
      );
      return outputRange[0] + t * (outputRange[1] - outputRange[0]);
    }

    // Ascending phase
    const ascendingTime = Math.max(time.current - delay, 0);
    const ascendingPercent = Math.min(ascendingTime / ascendingDuration, 1);
    const ascendingT = easeInOutCubic(ascendingPercent);
    const ascendingX = startX + ascendingT * ascendingXOffset;
    const ascendingY = startY + ascendingT * (ascendingYTarget - startY);
    const ascendingOpacity = fastInterpolate(
      ascendingPercent,
      [0.3, 0.8],
      [0, 1],
    );

    // Hovering phase
    const hoveringTime = Math.max(time.current - delay - ascendingDuration, 0);
    const hoveringPercent = Math.min(hoveringTime / hoveringDuration, 1);
    const hoveringT =
      easeOutQuart(hoveringPercent) *
      fastInterpolate(hoveringPercent, [0.8, 1], [1, 0.7]);
    const hoveringY = -hoveringAmplitude * hoveringT;

    // Descending phase
    const descendingTime = Math.max(
      time.current - delay - ascendingDuration - hoveringDuration,
      0,
    );
    const descendingPercent = Math.min(descendingTime / descendingDuration, 1);
    const descendingSpeedFactor = fastInterpolate(
      descendingTime,
      [0, 1000],
      [0.7, 1.0],
    );
    const descendingRotateAngle =
      descendingRandomFactor +
      (descendingTime / 1000) * (2 * Math.PI) * descendingRandomFactor;
    const descendingX =
      descendingTime * descendingSpeedX + Math.sin(descendingRotateAngle) * 10;
    const descendingY =
      descendingTime * descendingSpeedFactor * descendingSpeedY +
      Math.cos(descendingRotateAngle) * 10;
    const descendingOpacity = fastInterpolate(
      descendingPercent,
      [0.8, 1],
      [1, 0],
    );

    const rotate = ((hoveringTime / 1000) * rotationVelocity * Math.PI) / 180;
    const transform: Transforms2d = [
      {translateX: ascendingX + descendingX},
      {translateY: ascendingY + hoveringY + descendingY},
      {rotate},
      // {rotateX: rotate},
      {scale},
    ];

    return {
      transform,
      opacity: ascendingOpacity * descendingOpacity,
    };
  }, [time]);

  const opacity = useComputedValue(() => style.current.opacity, [style]);
  const transform = useComputedValue(() => style.current.transform, [style]);

  const image = useImage(animationProps.image);

  const {width, height} = RNImage.resolveAssetSource(animationProps.image);

  // Black and white image as Skia does not have tintColor
  return (
    image && (
      <Image
        image={image}
        width={width}
        height={height}
        opacity={opacity}
        transform={transform}
      />
    )
  );

  // Tinted confetti using a masked rectangle. It is super slow.
  // Could probably be optimized by masking all confettis with the same color at once
  return (
    image && (
      <Group opacity={opacity} transform={transform}>
        <Mask
          mask={
            <Image
              image={image}
              width={width}
              height={height}
              opacity={opacity}
              transform={transform}
            />
          }>
          <Rect width={width} height={height} color={animationProps.color} />
        </Mask>
      </Group>
    )
  );

  // Colored confetti as rectangle
  return (
    image && (
      <Rect
        width={width}
        height={height}
        color={animationProps.color}
        opacity={opacity}
        transform={transform}
      />
    )
  );
};

function getAnimationPropsForConfetti(
  containerWidth: number,
  containerHeight: number,
  config: ConfettiSkiaConfig,
) {
  return {
    delay: randomInRange(config.delayRange),
    startX: randomInRange(config.xSpawnRange) * containerWidth,
    startY: randomInRange(config.ySpawnRange) * containerHeight,
    ascendingDuration: randomInRange(config.ascendingDurationRange),
    ascendingXOffset: randomInRange(config.ascendingXOffsetRange),
    ascendingYTarget: randomInRange([-0.3, 0.2]) * containerHeight,
    hoveringDuration: randomInRange(config.hoveringDurationRange),
    hoveringAmplitude: randomInRange([2, 4]),
    descendingDuration: randomInRange(config.descendingDurationRange),
    descendingSpeedX: randomInRange([-30, 30]) / 1000,
    descendingSpeedY: randomInRange([150, 200]) / 1000,
    descendingRandomFactor: randomInRange([-1, 1]),
    rotationVelocity: randomInRange([40, 360]),
    scale: 0.9,
    color: sample(config.colors)!,
    image: sample(config.images)!,
  };
}

function randomInRange(range: readonly [number, number]) {
  return random(range[0], range[1], true);
}
