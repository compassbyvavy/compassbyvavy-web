/** Free printable scavenger hunts under Learn. PDFs live in public/printables/<slug>.pdf. Hunt content lives in scripts/printables; keep this file in step with it. */

export type PrintableSample = { n: number; fact: string; clue: string; pic?: string; challenge?: string };

export type Printable = {
  slug: string;
  title: string;
  ages: "3–5" | "5–7" | "7–9";
  chits: number;
  minutes: string;
  pages: number;
  format: string;
  lede: string;
  learns: string[];
  stages: { name: string; range: string }[];
  samples: PrintableSample[];
  steps: string[];
};

export const AGE_BANDS = [
  { ages: "3–5", label: "Ages 3–5", blurb: "Read-aloud hunts with picture hints and moves to try. No reading needed." },
  { ages: "5–7", label: "Ages 5–7", blurb: "A real fact and a rhyming riddle on every chit, for early readers." },
  { ages: "7–9", label: "Ages 7–9", blurb: "Tough puzzles: secret codes, scrambles, backwards words and riddles." },
] as const;

export const PRINTABLES: readonly Printable[] = [
  {
    "slug": "space-mission-scavenger-hunt",
    "title": "Space Mission Scavenger Hunt",
    "ages": "7–9",
    "chits": 40,
    "minutes": "60–90",
    "pages": 9,
    "format": "Riddles, secret codes, scrambles and backwards words",
    "lede": "An indoor treasure hunt that travels from the Sun to the edge of the universe. Every one of the 40 clue chits teaches a space fact, then sets a tough clue: riddles, secret number codes, scrambled words and backwards words.",
    "learns": [
      "The Sun, Mercury and Venus",
      "Earth, the Moon, and why we have seasons",
      "Mars and the asteroid belt",
      "Jupiter, Saturn, Uranus and Neptune",
      "Pluto, comets, stars, galaxies and black holes"
    ],
    "stages": [
      {
        "name": "The Sun, Mercury & Venus",
        "range": "1–8"
      },
      {
        "name": "Earth & the Moon",
        "range": "9–16"
      },
      {
        "name": "Mars & the Asteroid Belt",
        "range": "17–22"
      },
      {
        "name": "The Giant Planets",
        "range": "23–33"
      },
      {
        "name": "Pluto, Stars & the Universe",
        "range": "34–40"
      }
    ],
    "samples": [
      {
        "n": 1,
        "fact": "The Sun is a star. It is so big that more than a million Earths could fit inside it!",
        "clue": "Riddle: I hum all day and night. When you open me, a little light turns on. Inside it's always winter, the opposite of the Sun. What am I?"
      },
      {
        "n": 4,
        "fact": "Mercury goes all the way around the Sun in just 88 days, so a year there is only 88 days long!",
        "clue": "Secret code: 3 - 12 - 15 - 3 - 11. Mercury would win a race against me! (A=1, B=2 … Z=26)"
      },
      {
        "n": 18,
        "fact": "Mars has the biggest volcano in the solar system, Olympus Mons.",
        "clue": "Math mission: How many moons does Mars have? Add 1. Go to that step on the stairs, counting from the bottom."
      }
    ],
    "steps": [
      "Print the PDF and cut along the dashed lines. Fold each chit so the clue is hidden.",
      "Hide chits 2 to 40. A small note at the bottom of each chit says where it goes, and the answer key lists them all.",
      "Hand chit 1 and the Decoder Card to your astronaut. Each clue leads to the next chit. The prize waits under their bed.",
      "Read each “Did you know?” fact together before solving the clue. Too long for one go? Play one or two stages a day."
    ]
  },
  {
    "slug": "safari-sounds-treasure-hunt",
    "title": "Safari Sounds Treasure Hunt",
    "ages": "3–5",
    "chits": 20,
    "minutes": "30–45",
    "pages": 7,
    "format": "Read-aloud chits with picture hints and a move to try",
    "lede": "A read-aloud treasure hunt through the African savanna. Your little one meets 20 animals, copies how they move and sound, and follows picture hints around the house.",
    "learns": [
      "Animal names and sounds",
      "Where animals live: savanna, river, trees",
      "Animal family names: a pride, a herd",
      "Moving like animals (big body play)"
    ],
    "stages": [
      {
        "name": "Big Animals",
        "range": "1–5"
      },
      {
        "name": "Fast & Funny",
        "range": "6–10"
      },
      {
        "name": "Water & Wings",
        "range": "11–15"
      },
      {
        "name": "Treetops & Bedtime",
        "range": "16–20"
      }
    ],
    "samples": [
      {
        "n": 1,
        "fact": "Lions live on big grassy plains called savannas. A lion's roar is so loud you can hear it from far, far away.",
        "clue": "Find the cold box where the milk lives.",
        "pic": "🥛",
        "challenge": "Roar like a lion!"
      },
      {
        "n": 10,
        "fact": "Meerkats take turns standing tall to watch for danger while their family eats.",
        "clue": "Find a window. What can you see outside?",
        "pic": "🪟",
        "challenge": "Stand tall and look around like a meerkat."
      },
      {
        "n": 18,
        "fact": "Snakes smell with their tongues! They flick them in and out.",
        "clue": "Slither to the kitchen table and look under a chair.",
        "pic": "🪑",
        "challenge": "Hiss like a snake: sssss!"
      }
    ],
    "steps": [
      "Print the chits and cut along the dashed lines. Fold each one in half.",
      "Hide chits 2 onward where the tiny note at the bottom of each chit says. The prize goes in the last spot on the answer key.",
      "Read chit 1 aloud. Do the action together, then let your little one use the picture to find the next chit.",
      "Each chit is a mini lesson: read the fact, talk about it, then go hunting. Plan on 30 to 45 minutes."
    ]
  },
  {
    "slug": "rainbow-colours-and-shapes-hunt",
    "title": "Rainbow Colours & Shapes Hunt",
    "ages": "3–5",
    "chits": 20,
    "minutes": "30–45",
    "pages": 7,
    "format": "Read-aloud chits with picture hints and a move to try",
    "lede": "A read-aloud hunt that turns the whole house into a colour and shape lesson. 20 chits teach colours, colour mixing, shapes and counting, with a picture hint on every one.",
    "learns": [
      "Colour names, and mixing two colours to make a new one",
      "Shapes: circle, square, triangle, rectangle, oval, star, heart, diamond",
      "Counting sides and corners",
      "Spotting colours and shapes in everyday things"
    ],
    "stages": [
      {
        "name": "Red, Yellow & Blue",
        "range": "1–5"
      },
      {
        "name": "Shape Spotters",
        "range": "6–10"
      },
      {
        "name": "Mixing Magic",
        "range": "11–15"
      },
      {
        "name": "Rainbow Finish",
        "range": "16–20"
      }
    ],
    "samples": [
      {
        "n": 1,
        "fact": "Red is the colour of strawberries, apples and fire trucks.",
        "clue": "Find the bowl where the red apples live.",
        "pic": "🍎",
        "challenge": "Point to something red near you."
      },
      {
        "n": 10,
        "fact": "A star has 5 points. You can see stars in the sky at night.",
        "clue": "Find the blanket you snuggle in at night.",
        "pic": "🌙",
        "challenge": "Do a big star jump!"
      },
      {
        "n": 18,
        "fact": "A ball is a round shape you can hold and roll.",
        "clue": "Find the toy box. Is there a ball inside?",
        "pic": "⚽",
        "challenge": "Roll on the floor like a ball."
      }
    ],
    "steps": [
      "Print the chits and cut along the dashed lines. Fold each one in half.",
      "Hide chits 2 onward where the tiny note at the bottom of each chit says. The prize goes in the last spot on the answer key.",
      "Read chit 1 aloud. Do the action together, then let your little one use the picture to find the next chit.",
      "Each chit is a mini lesson: read the fact, talk about it, then go hunting. Plan on 30 to 45 minutes."
    ]
  },
  {
    "slug": "busy-body-treasure-hunt",
    "title": "Busy Body Treasure Hunt",
    "ages": "3–5",
    "chits": 20,
    "minutes": "30–45",
    "pages": 7,
    "format": "Read-aloud chits with picture hints and a move to try",
    "lede": "A wiggly read-aloud hunt about the amazing body. 20 chits teach body parts, the five senses and healthy habits, with a move to try and a picture hint on every chit.",
    "learns": [
      "Body parts and what they do",
      "The five senses: see, hear, smell, taste, touch",
      "Healthy habits: washing hands, brushing teeth, water, sleep",
      "Heart, lungs, bones and muscles, in simple words"
    ],
    "stages": [
      {
        "name": "My Senses",
        "range": "1–5"
      },
      {
        "name": "Inside Me",
        "range": "6–10"
      },
      {
        "name": "Strong & Busy",
        "range": "11–15"
      },
      {
        "name": "Healthy Habits",
        "range": "16–20"
      }
    ],
    "samples": [
      {
        "n": 1,
        "fact": "Your eyes help you see colours, shapes and the people you love.",
        "clue": "Find something that shows you your eyes.",
        "pic": "🪞",
        "challenge": "Blink 5 times!"
      },
      {
        "n": 10,
        "fact": "Your brain is the boss of your body. It helps you think, learn and remember.",
        "clue": "Find where the books live. Books feed your brain!",
        "pic": "📚",
        "challenge": "Tap your head gently. Hello, brain!"
      },
      {
        "n": 18,
        "fact": "Moving and playing makes your heart strong.",
        "clue": "Find the mat by the front door.",
        "pic": "🚪",
        "challenge": "Jump 10 times!"
      }
    ],
    "steps": [
      "Print the chits and cut along the dashed lines. Fold each one in half.",
      "Hide chits 2 onward where the tiny note at the bottom of each chit says. The prize goes in the last spot on the answer key.",
      "Read chit 1 aloud. Do the action together, then let your little one use the picture to find the next chit.",
      "Each chit is a mini lesson: read the fact, talk about it, then go hunting. Plan on 30 to 45 minutes."
    ]
  },
  {
    "slug": "ocean-explorer-scavenger-hunt",
    "title": "Ocean Explorer Scavenger Hunt",
    "ages": "5–7",
    "chits": 25,
    "minutes": "40–60",
    "pages": 6,
    "format": "Fact + rhyming riddle on every chit",
    "lede": "Dive from the sunny shore to the deep, dark sea. 25 chits teach a real ocean fact each, then give a rhyming clue to the next hiding spot.",
    "learns": [
      "The five oceans and why the sea is salty",
      "Coral reefs and the animals that live there",
      "Whales, dolphins, sharks and otters",
      "The deep sea, glowing animals, and keeping oceans clean"
    ],
    "stages": [
      {
        "name": "Sunny Shore",
        "range": "1–6"
      },
      {
        "name": "Coral Reef",
        "range": "7–13"
      },
      {
        "name": "Open Ocean",
        "range": "14–19"
      },
      {
        "name": "Deep Dark Sea",
        "range": "20–25"
      }
    ],
    "samples": [
      {
        "n": 1,
        "fact": "Oceans cover most of our planet. There are five: the Pacific, Atlantic, Indian, Southern and Arctic Oceans.",
        "clue": "I'm a little ocean inside your house. Fill me with water and splash like a fish!"
      },
      {
        "n": 12,
        "fact": "Parrotfish munch on coral, and some white sandy beaches are made partly from parrotfish poop!",
        "clue": "Talking of poop, here's a silly one: look in the toilet paper roll. That's fun!"
      },
      {
        "n": 23,
        "fact": "Some sea animals make their own light and glow in the dark water.",
        "clue": "Some sea creatures glow like stars at night. Find a window where you can see the night!"
      }
    ],
    "steps": [
      "Print the chits and cut along the dashed lines. Fold each one in half.",
      "Hide chits 2 onward where the tiny note at the bottom of each chit says. The prize goes in the last spot on the answer key.",
      "Hand chit 1 to your explorer. Read the fact together, then solve the rhyming clue to find the next chit.",
      "Plan on 40 to 60 minutes. Early readers may want help with the fact; let them try the clue first."
    ]
  },
  {
    "slug": "dinosaur-dig-scavenger-hunt",
    "title": "Dinosaur Dig Scavenger Hunt",
    "ages": "5–7",
    "chits": 25,
    "minutes": "40–60",
    "pages": 7,
    "format": "Fact + rhyming riddle on every chit",
    "lede": "Travel back millions of years to meet giant plant-eaters, fierce hunters and flying reptiles, then become a fossil detective. 25 chits, each with a real fact and a rhyming clue.",
    "learns": [
      "What dinosaurs were and when they lived",
      "Plant-eaters vs meat-eaters, and famous dinosaurs",
      "Why pterosaurs and sea reptiles weren't dinosaurs, and why birds are",
      "Fossils, paleontologists, Canada's dinosaurs, and the asteroid"
    ],
    "stages": [
      {
        "name": "Meet the Dinosaurs",
        "range": "1–7"
      },
      {
        "name": "Giants & Defenders",
        "range": "8–14"
      },
      {
        "name": "Sky, Sea & Birds",
        "range": "15–19"
      },
      {
        "name": "Fossil Detectives",
        "range": "20–25"
      }
    ],
    "samples": [
      {
        "n": 1,
        "fact": "Dinosaurs lived millions and millions of years ago, long before there were any people.",
        "clue": "Tick, tock, let's go back in time! Find the clock and you'll be fine."
      },
      {
        "n": 12,
        "fact": "Ankylosaurus was covered in armour, with a bony club on its tail.",
        "clue": "Armour protects, and so do these: find the boots for the snow and the freeze!"
      },
      {
        "n": 23,
        "fact": "Even dinosaur poop became fossils! Scientists call them coprolites.",
        "clue": "Dino poop turned to stone, how rude! Check the toilet paper roll, dude!"
      }
    ],
    "steps": [
      "Print the chits and cut along the dashed lines. Fold each one in half.",
      "Hide chits 2 onward where the tiny note at the bottom of each chit says. The prize goes in the last spot on the answer key.",
      "Hand chit 1 to your explorer. Read the fact together, then solve the rhyming clue to find the next chit.",
      "Plan on 40 to 60 minutes. Early readers may want help with the fact; let them try the clue first."
    ]
  },
  {
    "slug": "bug-and-garden-detectives-hunt",
    "title": "Bug & Garden Detectives Hunt",
    "ages": "5–7",
    "chits": 25,
    "minutes": "40–60",
    "pages": 6,
    "format": "Fact + rhyming riddle on every chit",
    "lede": "Grab your magnifying glass! 25 chits teach how insects, spiders, worms and plants live, from butterfly life cycles to Canadian maple syrup, each with a rhyming clue.",
    "learns": [
      "What makes an insect an insect (and why spiders aren't)",
      "Butterfly life cycle and monarch migration",
      "Bees, ants, ladybugs, fireflies and worms",
      "What plants need, how seeds grow, and where maple syrup comes from"
    ],
    "stages": [
      {
        "name": "Insect or Not?",
        "range": "1–5"
      },
      {
        "name": "Busy Bees & Ants",
        "range": "6–10"
      },
      {
        "name": "Creepy-Crawly Clues",
        "range": "11–15"
      },
      {
        "name": "Green Growers",
        "range": "16–21"
      },
      {
        "name": "Nature Detective",
        "range": "22–25"
      }
    ],
    "samples": [
      {
        "n": 1,
        "fact": "Insects have 6 legs and 3 body parts: head, thorax and abdomen.",
        "clue": "Insects have six legs; chairs have four. Look under a kitchen chair, down by the floor!"
      },
      {
        "n": 12,
        "fact": "Grasshoppers hear with ears on the sides of their tummies!",
        "clue": "Ears on your tummy? How funny is that! Look under the couch cushions where you sat."
      },
      {
        "n": 23,
        "fact": "In winter, many insects hide under leaves, logs and bark to stay safe until spring.",
        "clue": "Bugs hide away when winter comes near. Find your winter coat: the clue is here!"
      }
    ],
    "steps": [
      "Print the chits and cut along the dashed lines. Fold each one in half.",
      "Hide chits 2 onward where the tiny note at the bottom of each chit says. The prize goes in the last spot on the answer key.",
      "Hand chit 1 to your explorer. Read the fact together, then solve the rhyming clue to find the next chit.",
      "Plan on 40 to 60 minutes. Early readers may want help with the fact; let them try the clue first."
    ]
  },
  {
    "slug": "human-body-adventure-hunt",
    "title": "Human Body Adventure Hunt",
    "ages": "5–7",
    "chits": 25,
    "minutes": "40–60",
    "pages": 6,
    "format": "Fact + rhyming riddle on every chit",
    "lede": "A trip through bones, muscles, heart, lungs, tummy and brain. 25 chits teach how the body works, with moves to try and rhyming clues to solve.",
    "learns": [
      "Bones and muscles: how many, biggest and smallest",
      "Heart, blood and lungs",
      "The journey food takes through the body",
      "Brain, nerves, senses, skin and why sleep matters"
    ],
    "stages": [
      {
        "name": "Bones & Muscles",
        "range": "1–6"
      },
      {
        "name": "Heart & Lungs",
        "range": "7–12"
      },
      {
        "name": "The Food Journey",
        "range": "13–18"
      },
      {
        "name": "Brain & Senses",
        "range": "19–25"
      }
    ],
    "samples": [
      {
        "n": 1,
        "fact": "Your bones are hard and strong, and they hold your whole body up.",
        "clue": "Bones are strong like a metal spoon. Find the spoon drawer, and find it soon!"
      },
      {
        "n": 12,
        "fact": "Tiny hairs and sticky mucus in your nose catch dust and germs.",
        "clue": "Your nose catches dust: ah-choo! Find the tissue box, bless you!"
      },
      {
        "n": 23,
        "fact": "Smell and taste work together. When your nose is blocked, food tastes plain.",
        "clue": "Sniff something nice, like soap that's clean. Find the bathroom sink: it's where you've been!"
      }
    ],
    "steps": [
      "Print the chits and cut along the dashed lines. Fold each one in half.",
      "Hide chits 2 onward where the tiny note at the bottom of each chit says. The prize goes in the last spot on the answer key.",
      "Hand chit 1 to your explorer. Read the fact together, then solve the rhyming clue to find the next chit.",
      "Plan on 40 to 60 minutes. Early readers may want help with the fact; let them try the clue first."
    ]
  },
  {
    "slug": "around-the-world-scavenger-hunt",
    "title": "Around the World Scavenger Hunt",
    "ages": "7–9",
    "chits": 30,
    "minutes": "60–90",
    "pages": 7,
    "format": "Riddles, secret codes, scrambles and backwards words",
    "lede": "Visit 29 countries and Antarctica in one afternoon. Every chit teaches a capital city and a fun fact, then sets a puzzle: secret codes, scrambles, backwards words, missing letters and riddles.",
    "learns": [
      "Capital cities of 29 countries, on every continent",
      "Famous places: the Amazon, the pyramids, the Great Wall, Mount Everest",
      "How people live, eat and travel around the world",
      "Why Antarctica belongs to no country, and how many countries there are"
    ],
    "stages": [
      {
        "name": "North America",
        "range": "1–5"
      },
      {
        "name": "South America",
        "range": "6–9"
      },
      {
        "name": "Europe",
        "range": "10–15"
      },
      {
        "name": "Africa",
        "range": "16–20"
      },
      {
        "name": "Asia",
        "range": "21–26"
      },
      {
        "name": "Oceania & Antarctica",
        "range": "27–30"
      }
    ],
    "samples": [
      {
        "n": 1,
        "fact": "CANADA · Capital: Ottawa. Canada has the longest coastline of any country in the world.",
        "clue": "Secret code: 19 - 15 - 6 - 1. Look under its cushions."
      },
      {
        "n": 3,
        "fact": "MEXICO · Capital: Mexico City. People in Mexico and Central America were drinking chocolate thousands of years ago.",
        "clue": "Unscramble: E - E - R - L - C - A. It's a breakfast box."
      },
      {
        "n": 9,
        "fact": "CHILE · Capital: Santiago. Chile is one of the longest, thinnest countries on Earth. It also has one of the driest deserts.",
        "clue": "Riddle: I'm long and thin, and the more I dry you, the wetter I get."
      }
    ],
    "steps": [
      "Print the chits and cut along the dashed lines. Fold each one in half.",
      "Hide chits 2 onward where the tiny note at the bottom of each chit says. The prize goes in the last spot on the answer key.",
      "Cut out the Decoder Card and hand it over with chit 1. Each puzzle names the next hiding spot.",
      "Plan on 60 to 90 minutes, or play one or two stages a day."
    ]
  },
  {
    "slug": "canada-coast-to-coast-hunt",
    "title": "Canada Coast to Coast Hunt",
    "ages": "7–9",
    "chits": 30,
    "minutes": "60–90",
    "pages": 7,
    "format": "Riddles, secret codes, scrambles and backwards words",
    "lede": "A journey across all 10 provinces and 3 territories, from Victoria to St. John's and up to Iqaluit. 30 chits teach capitals, geography, Indigenous cultures and Canadian symbols, with a puzzle on every one.",
    "learns": [
      "All 13 provinces and territories and their capitals",
      "Canadian geography: Rockies, prairies, Great Lakes, Bay of Fundy, the North",
      "First Nations and Inuit cultures, English and French",
      "Canadian symbols: beaver, maple leaf, loonie, hockey, Canada Day"
    ],
    "stages": [
      {
        "name": "Welcome to Canada",
        "range": "1–3"
      },
      {
        "name": "The West",
        "range": "4–8"
      },
      {
        "name": "Ontario & Quebec",
        "range": "9–12"
      },
      {
        "name": "Atlantic Canada",
        "range": "13–18"
      },
      {
        "name": "The North",
        "range": "19–22"
      },
      {
        "name": "Canadian Symbols",
        "range": "23–30"
      }
    ],
    "samples": [
      {
        "n": 2,
        "fact": "OTTAWA, Ontario, is Canada's capital city. The Peace Tower on Parliament Hill has a big clock.",
        "clue": "Secret code: 3 - 12 - 15 - 3 - 11. Tick, tock!"
      },
      {
        "n": 7,
        "fact": "SASKATCHEWAN · Capital: Regina. Its flat prairies grow huge amounts of wheat.",
        "clue": "Unscramble: L - A - E - C - E - R. Made from grains like wheat!"
      },
      {
        "n": 5,
        "fact": "BRITISH COLUMBIA · Many First Nations on the west coast carve tall totem poles that tell family stories.",
        "clue": "Riddle: I have lots of spines but no bones, and I'm full of stories."
      }
    ],
    "steps": [
      "Print the chits and cut along the dashed lines. Fold each one in half.",
      "Hide chits 2 onward where the tiny note at the bottom of each chit says. The prize goes in the last spot on the answer key.",
      "Cut out the Decoder Card and hand it over with chit 1. Each puzzle names the next hiding spot.",
      "Plan on 60 to 90 minutes, or play one or two stages a day."
    ]
  },
  {
    "slug": "planet-earth-expedition-hunt",
    "title": "Planet Earth Expedition Hunt",
    "ages": "7–9",
    "chits": 30,
    "minutes": "60–90",
    "pages": 7,
    "format": "Riddles, secret codes, scrambles and backwards words",
    "lede": "Dig to the centre of the Earth, ride a volcano, follow a raindrop and chase a storm. 30 chits teach earth science and weather, with a puzzle on every one.",
    "learns": [
      "Earth's layers, plates, earthquakes and mountains",
      "Volcanoes, rocks, fossils and gems",
      "The water cycle, oceans, rivers and ice",
      "Weather, lightning, rainbows, seasons, and caring for the planet"
    ],
    "stages": [
      {
        "name": "Inside the Earth",
        "range": "1–6"
      },
      {
        "name": "Rocks & Volcanoes",
        "range": "7–12"
      },
      {
        "name": "Water World",
        "range": "13–18"
      },
      {
        "name": "Weather Wonders",
        "range": "19–25"
      },
      {
        "name": "Protect Our Planet",
        "range": "26–30"
      }
    ],
    "samples": [
      {
        "n": 2,
        "fact": "Earth's inner core is almost as hot as the surface of the Sun!",
        "clue": "Secret code: 6 - 18 - 9 - 4 - 7 - 5. Cool down!"
      },
      {
        "n": 5,
        "fact": "Mountains form when plates push together. The Himalayas are still growing a tiny bit every year!",
        "clue": "Unscramble: K - L - B - H - E - S - O - F - O. Look on the top shelf, like a mountain peak."
      },
      {
        "n": 7,
        "fact": "Melted rock underground is called magma. When it comes out of a volcano, it's called lava.",
        "clue": "Riddle: I'm shaped like a hand, and I protect you from very hot things."
      }
    ],
    "steps": [
      "Print the chits and cut along the dashed lines. Fold each one in half.",
      "Hide chits 2 onward where the tiny note at the bottom of each chit says. The prize goes in the last spot on the answer key.",
      "Cut out the Decoder Card and hand it over with chit 1. Each puzzle names the next hiding spot.",
      "Plan on 60 to 90 minutes, or play one or two stages a day."
    ]
  }
];

export function printablePdf(slug: string): string {
  return `/printables/${slug}.pdf`;
}

export function getPrintable(slug: string): Printable | undefined {
  return PRINTABLES.find((p) => p.slug === slug);
}
