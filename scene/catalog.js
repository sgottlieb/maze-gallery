// Static catalog of all available pieces. Order here determines default thumbnail order in overlay.
// Each piece: { id, series, type: 'image'|'video', src, thumbSrc }.

export const PIECES = [
  // Match
  { id: 'Match_01', series: 'Match', type: 'image', src: './art/match/Match_01.jpg' },
  { id: 'Match_07', series: 'Match', type: 'image', src: './art/match/Match_07.jpg' },
  { id: 'Match_13', series: 'Match', type: 'image', src: './art/match/Match_13.jpg' },
  // Me
  { id: 'Me_01', series: 'Me', type: 'image', src: './art/me/Me_01.jpg' },
  { id: 'Me_07', series: 'Me', type: 'image', src: './art/me/Me_07.jpg' },
  { id: 'Me_12', series: 'Me', type: 'image', src: './art/me/Me_12.jpg' },
  // Mother
  { id: 'Mother_01', series: 'Mother', type: 'image', src: './art/mother/Mother_01.jpg' },
  { id: 'Mother_04', series: 'Mother', type: 'image', src: './art/mother/Mother_04.jpg' },
  { id: 'Mother_10', series: 'Mother', type: 'image', src: './art/mother/Mother_10.jpg' },
  // Animated
  { id: 'Dreamstorm', series: 'Animated', type: 'video', src: './art/animated/Dreamstorm.webm' },
  { id: 'Hello_World', series: 'Animated', type: 'video', src: './art/animated/Hello_World.webm' },
  { id: 'May_Her_Memory_Be_a_Blessing', series: 'Animated', type: 'video', src: './art/animated/May_Her_Memory_Be_a_Blessing.webm' },
  { id: 'Pantheons_Playground', series: 'Animated', type: 'video', src: './art/animated/Pantheons_Playground.webm' },
  { id: 'Peter_and_Wendy', series: 'Animated', type: 'video', src: './art/animated/Peter_and_Wendy.webm' },
  // Retro — Y2K homages to the original Windows 3D Maze
  { id: 'Brick', series: 'Retro', type: 'image', src: './art/retro/Brick.png' },
  { id: 'Sky', series: 'Retro', type: 'image', src: './art/retro/Sky.png' },
  { id: 'Checker', series: 'Retro', type: 'image', src: './art/retro/Checker.png' },
  { id: 'Stars', series: 'Retro', type: 'image', src: './art/retro/Stars.png' },
];

for (const p of PIECES) {
  p.thumbSrc = `./art/thumbs/${p.id}.jpg`;
}

export const SERIES = ['Match', 'Me', 'Mother', 'Animated', 'Retro'];

export const DEFAULT_SELECTIONS = {
  walls: ['Dreamstorm', 'May_Her_Memory_Be_a_Blessing', 'Peter_and_Wendy'],
  floor: ['Mother_01', 'Mother_04', 'Mother_10'],
  ceiling: ['Me_01', 'Me_07', 'Me_12'],
};
