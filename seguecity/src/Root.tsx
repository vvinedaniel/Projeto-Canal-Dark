import { Composition } from 'remotion';
import React from 'react';
import { Debug } from './scenes/Debug';
import { Sandbox } from './scenes/Sandbox';
import { CityDemo, DEMO_SECONDS } from './scenes/demo/CityDemo';
import { Ep01, EP01_SECONDS } from './scenes/ep01/Ep01';

const FPS = 30;
export const Root: React.FC = () => (
  <>
    <Composition id="Ep01" component={Ep01} width={1080} height={1920} fps={FPS} durationInFrames={EP01_SECONDS * FPS} />
    <Composition id="CityDemo" component={CityDemo} width={1080} height={1920} fps={FPS} durationInFrames={DEMO_SECONDS * FPS} />
    <Composition id="Sandbox" component={Sandbox} width={1080} height={1920} fps={FPS} durationInFrames={300} defaultProps={{ i: 16, j: 16, z: 0, zoom: 1, night: 1, home: 1, traffic: 1, people: 1 }} />
    <Composition id="Debug" component={Debug} width={1080} height={1920} fps={FPS} durationInFrames={30} defaultProps={{ zoom: 1 }} />
  </>
);
