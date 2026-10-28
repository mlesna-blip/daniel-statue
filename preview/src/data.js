// Section metadata. Scripture quotes are KJV (public domain).
// Kingdom identifications after Babylon follow the common traditional reading; the text itself names only Babylon.
export const SECTIONS = [
  { id: 'head', part: 'Head', metal: 'Fine Gold', kingdom: 'Babylon', era: 'c. 605 – 539 BC',
    ref: 'Daniel 2:32, 37–38', quote: '“Thou art this head of gold.”',
    desc: 'The only kingdom the text names directly: Nebuchadnezzar\u2019s Neo-Babylonian empire, given “a kingdom, power, and strength, and glory.”' },
  { id: 'chest', part: 'Chest & Arms', metal: 'Silver', kingdom: 'Medo-Persia', era: 'c. 539 – 331 BC',
    ref: 'Daniel 2:32, 39', quote: '“After thee shall arise another kingdom inferior to thee.”',
    desc: 'Commonly identified with the Medo-Persian empire (compare Daniel 8:20). The two arms are often read as its two peoples, the Medes and the Persians.' },
  { id: 'belly', part: 'Belly & Thighs', metal: 'Bronze', kingdom: 'Greece', era: 'c. 331 – 168 BC',
    ref: 'Daniel 2:32, 39', quote: '“Another third kingdom of brass, which shall bear rule over all the earth.”',
    desc: 'Commonly identified with Alexander\u2019s Greek empire and the kingdoms that succeeded it (compare Daniel 8:21).' },
  { id: 'legs', part: 'Legs', metal: 'Iron', kingdom: 'Rome', era: 'c. 168 BC – AD 476',
    ref: 'Daniel 2:33, 40', quote: '“The fourth kingdom shall be strong as iron: forasmuch as iron breaketh in pieces and subdueth all things.”',
    desc: 'Traditionally identified with Rome, the iron power that crushed and absorbed the kingdoms before it.' },
  { id: 'feet', part: 'Feet & Ten Toes', metal: 'Iron mixed with Clay', kingdom: 'The Divided Kingdoms', era: 'After the fourth kingdom',
    ref: 'Daniel 2:33, 41–43', quote: '“The kingdom shall be partly strong, and partly broken \u2026 but they shall not cleave one to another, even as iron is not mixed with clay.”',
    desc: 'A divided kingdom, partly strong and partly brittle. Interpreters differ on what the ten toes stand for; many read them as the fragmented nations that followed.' },
];
export const STONE = { id: 'stone', part: 'The Stone', metal: 'Cut out without hands', kingdom: 'An Everlasting Kingdom', era: 'Daniel 2:34–35, 44–45',
  ref: 'Daniel 2:44', quote: '“The God of heaven shall set up a kingdom, which shall never be destroyed.”',
  desc: 'A stone strikes the image on its feet. The whole statue breaks and is blown away like chaff, and the stone becomes a great mountain that fills the whole earth.' };
export const CAPTIONS = [
  [0.9, 'A stone was cut out without hands', 'Daniel 2:34'],
  [3.0, '\u2026which smote the image upon his feet that were of iron and clay, and brake them to pieces', 'Daniel 2:34'],
  [5.6, '\u2026and became like the chaff of the summer threshingfloors; and the wind carried them away', 'Daniel 2:35'],
  [9.6, 'And the stone that smote the image became a great mountain, and filled the whole earth', 'Daniel 2:35'],
  [13.4, '\u2026a kingdom, which shall never be destroyed \u2026 and it shall stand for ever', 'Daniel 2:44'],
];
