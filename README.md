# Realm of Idle Wardens

## Overview
"Realm of Idle Wardens" is a medieval-themed tycoon, idle, and tower defense game where players manage resources, build defenses, and fend off waves of enemies. The game features a rich fantasy world filled with swords, axes, mages, and various other elements that enhance the gameplay experience.

## Features
- **Idle Mechanics**: Players can progress even when not actively playing.
- **Tower Defense**: Build and upgrade towers to defend against enemy waves.
- **Resource Management**: Collect and manage resources to upgrade your defenses and characters.
- **Medieval Theme**: Immerse yourself in a world of knights, mages, and mythical creatures.

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript (vanilla or React)
- **Backend**: Firebase (Realtime Database, Authentication)
- **Hosting**: Firebase Hosting

## Project Structure
```
realm-of-idle-wardens
├── public
│   ├── index.html
│   ├── styles
│   │   └── main.css
│   └── assets
│       └── (game sprites, icons, etc.)
├── src
│   ├── app.js
│   ├── firebase.js
│   ├── leaderboard.js
│   ├── game
│   │   ├── engine.js
│   │   ├── state.js
│   │   └── ui.js
├── package.json
├── .gitignore
└── README.md
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/realm-of-idle-wardens.git
   ```
2. Navigate to the project directory:
   ```
   cd realm-of-idle-wardens
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Set up Firebase:
   - Create a Firebase project and configure the `firebase.js` file with your project credentials.
5. Start the development server:
   ```
   npm start
   ```

## Gameplay Mechanics
- Players start with basic resources and must build towers to defend against incoming enemies.
- As players progress, they can unlock new towers, upgrade existing ones, and manage resources more efficiently.
- The game features various enemy types, each with unique abilities and challenges.

## Contribution Guidelines
- Contributions are welcome! Please fork the repository and submit a pull request.
- Ensure that your code adheres to the project's coding standards and includes appropriate tests.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.