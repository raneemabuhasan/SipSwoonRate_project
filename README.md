# Coffee Rating App

A React-based coffee rating application built with Instant DB for real-time data synchronization.

## Features

- User authentication (sign up/sign in with email)
- Add coffee shops with location
- Rate coffee shops (1-5 stars)
- Write text reviews
- Search coffee shops by name
- Filter by minimum rating
- Sort by newest, highest rated, or name
- View statistics (total shops, reviews, average rating)
- Edit and delete your own reviews
- Real-time updates across all users

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Instant DB account (free at [instantdb.com](https://instantdb.com))

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Instant DB:**
   - Sign up at [instantdb.com](https://instantdb.com)
   - Create a new app
   - Copy your APP_ID

3. **Create environment file:**
   - Copy `.env.example` to `.env`
   - Add your Instant DB APP_ID:
     ```
     VITE_INSTANT_APP_ID=your_app_id_here
     ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   - Navigate to `http://localhost:5173` (or the port shown in terminal)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
src/
├── components/
│   ├── Auth.jsx          # Authentication component
│   ├── CoffeeList.jsx    # Main list of coffee shops
│   ├── ReviewCard.jsx    # Individual review display
│   ├── ReviewForm.jsx   # Form to add/edit reviews
│   ├── SearchBar.jsx     # Search and filter UI
│   ├── StarRating.jsx   # Star rating component
│   └── Stats.jsx        # Statistics dashboard
├── styles/
│   └── App.css          # Main stylesheet
├── utils/
│   └── helpers.js       # Helper functions
├── App.jsx              # Main app component
├── db.js                # Instant DB configuration
└── main.jsx             # React entry point
```

## Technologies

- **React** - UI framework
- **Vite** - Build tool and dev server
- **Instant DB** - Real-time database and authentication

## Notes

- All data is stored in Instant DB cloud
- Authentication is handled by Instant DB
- Real-time sync works automatically
- Works offline with sync when online

