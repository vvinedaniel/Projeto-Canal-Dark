import { Composition } from 'remotion';
import React from 'react';
import { Debug } from './scenes/Debug';
import { Sandbox, SignTour, SIGN_TOUR } from './scenes/Sandbox';
import { Interiores } from './scenes/Interiores';
import { Poster } from './scenes/Poster';
import { CityDemo, DEMO_SECONDS } from './scenes/demo/CityDemo';
import { Ep01, EP01_SECONDS } from './scenes/ep01/Ep01';
import { Capa } from './scenes/ep01/Capas';
import { FichaFundadores, FichaFundador } from './scenes/ep02/Fundadores';
import { Dia02Preview } from './scenes/ep02/Preview';
import { Ep02, EP02_SECONDS } from './scenes/ep02/Ep02';
import { CapaEp02 } from './scenes/ep02/Capas';

const FPS = 30;
export const Root: React.FC = () => (
  <>
    <Composition id="Ep01" component={Ep01} width={1080} height={1920} fps={FPS} durationInFrames={EP01_SECONDS * FPS} />
    <Composition id="Ep02" component={Ep02} width={1080} height={1920} fps={FPS} durationInFrames={EP02_SECONDS * FPS} />
    <Composition id="Ep02Capa" component={CapaEp02} width={1080} height={1920} fps={FPS} durationInFrames={1} defaultProps={{ v: 'A' as 'A' | 'B' | 'C' }} />
    <Composition id="Fundadores" component={FichaFundadores} width={1080} height={1920} fps={FPS} durationInFrames={30} />
    <Composition id="FichaFundador" component={FichaFundador} width={1080} height={1080} fps={FPS} durationInFrames={30} defaultProps={{ id: 'm0001' }} />
    <Composition id="Dia02Preview" component={Dia02Preview} width={1080} height={1920} fps={FPS} durationInFrames={300} defaultProps={{ shot: 0 }} />
    <Composition id="Ep01Capa" component={Capa} width={1080} height={1920} fps={FPS} durationInFrames={1} defaultProps={{ v: 'A' as 'A' | 'B' | 'C' }} />
    <Composition id="CityDemo" component={CityDemo} width={1080} height={1920} fps={FPS} durationInFrames={DEMO_SECONDS * FPS} />
    <Composition id="Sandbox" component={Sandbox} width={1080} height={1920} fps={FPS} durationInFrames={300} defaultProps={{ i: 16, j: 16, z: 0, zoom: 1, night: 1, home: 1, traffic: 1, people: 1 }} />
    <Composition id="Poster4K" component={Poster} width={2160} height={3840} fps={FPS} durationInFrames={300} defaultProps={{ i: 15.5, j: 15.5, z: 0, zoom: 1.2, night: 1, home: 0, traffic: 0, people: 0 }} />
    <Composition id="Placas" component={SignTour} width={1080} height={1920} fps={FPS} durationInFrames={SIGN_TOUR.length} />
    <Composition id="Interiores" component={Interiores} width={1080} height={1920} fps={FPS} durationInFrames={90} />
    <Composition id="Debug" component={Debug} width={1080} height={1920} fps={FPS} durationInFrames={30} defaultProps={{ zoom: 1 }} />
  </>
);
