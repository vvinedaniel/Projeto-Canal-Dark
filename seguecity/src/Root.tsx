import { Composition } from 'remotion';
import React from 'react';
import { Debug } from './scenes/Debug';
import { Sandbox } from './scenes/Sandbox';
import { CityDemo, DEMO_SECONDS } from './scenes/demo/CityDemo';
import { FontTest } from './scenes/FontTest';

const FPS = 30;
export const Root: React.FC = () => (
  <>
    <Composition id="CityDemo" component={CityDemo} width={1080} height={1920} fps={FPS} durationInFrames={DEMO_SECONDS * FPS} />
    <Composition id="Sandbox" component={Sandbox} width={1080} height={1920} fps={FPS} durationInFrames={300} defaultProps={{ i: 16, j: 16, z: 0, zoom: 1, night: 1, home: 1, traffic: 1, people: 1 }} />
    <Composition id="FontTest" component={FontTest} width={1080} height={1920} fps={FPS} durationInFrames={1} />
    <Composition id="Debug" component={Debug} width={1080} height={1920} fps={FPS} durationInFrames={30} defaultProps={{ zoom: 1 }} />
  </>
);
