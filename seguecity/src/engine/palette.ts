// Paleta da SegueCity: rampas com deslocamento de matiz (sombras frias, luzes quentes), estilo 16-bit.
import { hex, ramp } from './color';

export const P = {
  // construção
  concrete: ramp('#2e2d3d', '#454457', '#5f5d70', '#7c7a8b', '#9d9aa6', '#c0bcc2', '#e2ddd9'),
  cream: ramp('#3d2f3a', '#5f4a4c', '#86685f', '#ad8a74', '#cdab8a', '#e6caa3', '#f6e6c4'),
  brick: ramp('#2d1824', '#4a2130', '#6e2e36', '#93403b', '#b45a45', '#cf7a58', '#e39e75'),
  terracotta: ramp('#33172a', '#56202c', '#7f2f2f', '#a84733', '#ca663f', '#e38c55', '#f2b277'),
  slate: ramp('#1b1c31', '#262b48', '#35405f', '#475a7a', '#5e7896', '#7f9bb3', '#a9c2d3'),
  glass: ramp('#0e1830', '#152647', '#1c3a62', '#265580', '#33739c', '#5097b6', '#82c0d2'),
  white: ramp('#3c4257', '#566079', '#76829a', '#99a5ba', '#bfc8d6', '#dfe5ec', '#f7f9fb'),
  orange: ramp('#3b1f22', '#5f2e26', '#8a4428', '#b5612c', '#d98638', '#efaf4f', '#fad37a'),
  stone: ramp('#34303f', '#4c4656', '#686070', '#877d8a', '#a69ba4', '#c6bbbd', '#e4dbd3'),
  police: ramp('#10152d', '#182346', '#213565', '#2c4c88', '#3c67a8', '#5788c6', '#7eaee0'),
  teal: ramp('#0f2629', '#16393b', '#1e5150', '#2a6b65', '#3a887b', '#55a692', '#7ec4aa'),
  mint: ramp('#1f3433', '#2d4b47', '#3f665d', '#548276', '#6d9f90', '#8dbcaa', '#b4d8c6'),
  pink: ramp('#38182f', '#57213f', '#7d2f51', '#a34365', '#c45f7c', '#dd8597', '#efb0b5'),
  yellow: ramp('#3d2b17', '#62411c', '#8c5d20', '#b78025', '#dba734', '#f0cb52', '#faea8c'),
  lilac: ramp('#251f3d', '#362d58', '#4a3f74', '#615690', '#7b71aa', '#9a92c3', '#bfb9db'),
  green: ramp('#152b26', '#1d4030', '#285938', '#367540', '#4b9148', '#6bad55', '#95c86c'),
  // natureza
  grass: ramp('#16301f', '#1f4427', '#2a5a2e', '#387034', '#4b873a', '#649d42', '#83b14d'),
  foliage: ramp('#0f2219', '#163423', '#1f492b', '#2b6132', '#3c7a38', '#539441', '#74ad4e', '#9cc55e'),
  ipeY: ramp('#4a2e10', '#7a4c15', '#a8731c', '#d19d24', '#edc432', '#f9df5e', '#fff2a2'),
  ipeP: ramp('#33142f', '#561e48', '#7f2b63', '#a83c80', '#cc5a9c', '#e483b9', '#f4b3d4'),
  palm: ramp('#122a1f', '#1a3d27', '#24552e', '#326e33', '#46883a', '#62a143'),
  trunk: ramp('#24160f', '#3a2216', '#54311d', '#6e4326', '#8b5a33'),
  sand: ramp('#4b3a2c', '#6c5538', '#8f7446', '#b19557', '#ccb26c', '#e2cc89'),
  dirt: ramp('#2b1a16', '#43281d', '#5d3a25', '#784e2e', '#94653a', '#ad7f4b'),
  soil: ramp('#190f12', '#26171a', '#382220', '#4d2f27', '#653f30', '#80533c'),
  clay: ramp('#3a1f1c', '#5a2f22', '#7c4428', '#9d5d31', '#ba7a3e', '#d29a52'),
  rock: ramp('#1c1a24', '#2a2733', '#3b3746', '#504b5b', '#67616f', '#817a86', '#9d96a0'),
  water: ramp('#0b1a33', '#0f2747', '#14385e', '#1b4c77', '#256591', '#3582aa', '#56a2c2', '#8ac7da'),
  // rua
  asphalt: ramp('#1a1c25', '#22252f', '#2b2f3a', '#353a47', '#414755', '#4f5665'),
  walk: ramp('#3b3843', '#55515c', '#706b75', '#8c8690', '#a8a1a8', '#c4bdbf', '#ddd6d4'),
  curb: ramp('#56535e', '#8a858d', '#bdb7b8'),
  paver: ramp('#4f4547', '#6e6061', '#8e7d79', '#ad9b92', '#c9b8aa', '#e0d0c0'),
  // metal, madeira, tecido
  metal: ramp('#16181f', '#22262f', '#323743', '#465060', '#5e6a7a', '#7d8a98', '#a3aeb8'),
  wood: ramp('#26160f', '#3c2216', '#56321f', '#71452a', '#8f5c37', '#ad7646'),
  red: ramp('#300f19', '#521522', '#7b1d2a', '#a52b31', '#c9443a', '#e2684d', '#f39470'),
  blue: ramp('#101b3a', '#16275a', '#1f387e', '#2b4ea1', '#3c69c0', '#5b8bd8', '#86b0ea'),
  purple: ramp('#1f1236', '#311a52', '#46246f', '#5d318c', '#7743a8', '#9561c1', '#b48ad6'),
  black: ramp('#0b0b12', '#14141e', '#1e1e2b', '#2a2a3a'),
};

// Emissão (luzes acesas): cores somadas por cima do quadro escurecido.
export const E = {
  warm: hex('#ffcf6e'),
  warm2: hex('#ffb257'),
  warmDim: hex('#c98a3e'),
  cool: hex('#bfe4ff'),
  tv: hex('#7fa8ff'),
  lamp: hex('#fff0bf'),
  lampWarm: hex('#ffd98a'),
  neonPink: hex('#ff5aa8'),
  neonCyan: hex('#5af2ff'),
  neonGreen: hex('#7dff8a'),
  red: hex('#ff3b3b'),
  green: hex('#5dff7c'),
  amber: hex('#ffb12b'),
  blue: hex('#4f8dff'),
  white: hex('#ffffff'),
  head: hex('#fff6d8'),
  tail: hex('#ff2a3d'),
  fountain: hex('#69e8ff'),
  crystal: hex('#6ef5ff'),
};

export const T = 0; // transparente
