# Step 1: Chicago White Sox Data Collection - FIXED VERSION
# This script collects recent game data and upcoming schedule for the White Sox

import pandas as pd
import requests
from datetime import datetime, timedelta
import json

# Install required package first: pip install MLB-StatsAPI
try:
    import statsapi
    print("✓ MLB-StatsAPI package found")
except ImportError:
    print("❌ Please install: pip install MLB-StatsAPI")
    exit()

def debug_api_response():
    """
    Debug function to examine the actual API response structure
    """
    print("🔍 DEBUG: Examining API response structure...")
    
    try:
        # Get a small sample of recent games
        schedule = statsapi.schedule(
            start_date='2025-05-01',
            end_date='2025-06-07',
            team=145  # White Sox
        )
        
        if not schedule:
            print("❌ No games found in the date range")
            return None
        
        print(f"Found {len(schedule)} games")
        print("\n" + "="*50)
        print("SAMPLE GAME DATA STRUCTURE:")
        print("="*50)
        
        # Print first game's structure
        sample_game = schedule[0] if schedule else {}
        for key, value in sample_game.items():
            print(f"{key}: {value}")
        
        print("\n" + "="*50)
        print("AVAILABLE KEYS:")
        print("="*50)
        print(list(sample_game.keys()))
        
        return schedule
        
    except Exception as e:
        print(f"❌ Debug error: {e}")
        return None

def get_whitesox_recent_games(num_games=20):
    """
    Fetch the White Sox's recent games
    Team ID for Chicago White Sox is 145
    """
    print(f"Fetching last {num_games} White Sox games...")
    
    try:
        # Get recent games
        schedule = statsapi.schedule(
            start_date='2025-04-15',  # Start of season
            end_date='2025-06-07',    # Current date
            team=145  # White Sox team ID
        )
        
        if not schedule:
            print("❌ No games found")
            return pd.DataFrame()
        
        # Debug: Print first game structure to see available keys
        print("DEBUG: First game keys:", list(schedule[0].keys()))
        
        games_data = []
        for i, game in enumerate(schedule[-num_games:]):  # Get last num_games
            try:
                print(f"Processing game {i+1}: {game}")
                
                # Check if game is completed - try different possible status keys
                game_status = game.get('status', game.get('game_status', 'Unknown'))
                if game_status not in ['Final', 'Completed', 'F']:
                    print(f"Skipping game {i+1}: Status is '{game_status}'")
                    continue
                
                # Determine if White Sox won based on scores
                home_team = game.get('home_name', game.get('home_team', ''))
                away_team = game.get('away_name', game.get('away_team', ''))
                
                is_home = 'Chicago White Sox' in home_team or 'White Sox' in home_team
                
                # Try different possible score keys
                home_score = game.get('home_score', game.get('home_runs', 0))
                away_score = game.get('away_score', game.get('away_runs', 0))
                
                if is_home:
                    white_sox_won = home_score > away_score
                    runs_scored = home_score
                    runs_allowed = away_score
                    opponent = away_team
                else:
                    white_sox_won = away_score > home_score
                    runs_scored = away_score
                    runs_allowed = home_score
                    opponent = home_team
                
                game_info = {
                    'date': game.get('game_date', game.get('date', 'Unknown')),
                    'opponent': opponent,
                    'home_game': is_home,
                    'result': 'W' if white_sox_won else 'L',
                    'runs_scored': runs_scored,
                    'runs_allowed': runs_allowed,
                    'game_id': game.get('game_id', f"game_{i+1}"),
                    'status': game_status
                }
                games_data.append(game_info)
                print(f"✓ Added game: {game_info['date']} vs {game_info['opponent']} - {game_info['result']}")
                
            except Exception as e:
                print(f"❌ Error processing game {i+1}: {e}")
                print(f"Game data keys: {list(game.keys()) if isinstance(game, dict) else 'Not a dict'}")
                continue
        
        df = pd.DataFrame(games_data)
        print(f"✓ Collected {len(df)} completed games")
        return df
        
    except Exception as e:
        print(f"❌ Error in get_whitesox_recent_games: {e}")
        return pd.DataFrame()

def get_whitesox_upcoming_games(num_games=10):
    """
    Fetch the White Sox's upcoming games for prediction
    """
    print(f"Fetching next {num_games} White Sox games...")
    
    try:
        # Get future games
        end_date = datetime.now() + timedelta(days=30)  # Next 30 days
        schedule = statsapi.schedule(
            start_date='2025-06-08',  # Tomorrow
            end_date=end_date.strftime('%Y-%m-%d'),
            team=145  # White Sox team ID
        )
        
        if not schedule:
            print("❌ No upcoming games found")
            return pd.DataFrame()
        
        upcoming_games = []
        for i, game in enumerate(schedule[:num_games]):  # Get next num_games
            try:
                home_team = game.get('home_name', game.get('home_team', ''))
                away_team = game.get('away_name', game.get('away_team', ''))
                
                is_home = 'Chicago White Sox' in home_team or 'White Sox' in home_team
                opponent = away_team if is_home else home_team
                
                game_info = {
                    'date': game.get('game_date', game.get('date', 'Unknown')),
                    'opponent': opponent,
                    'home_game': is_home,
                    'game_id': game.get('game_id', f"upcoming_{i+1}")
                }
                upcoming_games.append(game_info)
                print(f"✓ Added upcoming game: {game_info['date']} vs {game_info['opponent']}")
                
            except Exception as e:
                print(f"❌ Error processing upcoming game {i+1}: {e}")
                continue
        
        df = pd.DataFrame(upcoming_games)
        print(f"✓ Collected {len(df)} upcoming games")
        return df
        
    except Exception as e:
        print(f"❌ Error in get_whitesox_upcoming_games: {e}")
        return pd.DataFrame()

def alternative_data_collection():
    """
    Alternative method using direct HTTP requests to MLB Stats API
    """
    print("🔄 Using alternative direct API method...")
    
    # Base URL for MLB Stats API
    base_url = "https://statsapi.mlb.com/api/v1"
    
    # Get White Sox schedule (recent games)
    schedule_url = f"{base_url}/schedule?sportId=1&teamId=145&startDate=2025-05-01&endDate=2025-06-07"
    
    try:
        print(f"Fetching: {schedule_url}")
        response = requests.get(schedule_url)
        
        if response.status_code != 200:
            print(f"❌ API request failed: {response.status_code}")
            return pd.DataFrame()
        
        data = response.json()
        print("✓ API request successful")
        
        games = []
        for date_data in data.get('dates', []):
            for game in date_data.get('games', []):
                try:
                    # Extract game information
                    home_team = game['teams']['home']['team']['name']
                    away_team = game['teams']['away']['team']['name']
                    
                    if 'White Sox' in home_team or 'White Sox' in away_team:
                        is_home = 'White Sox' in home_team
                        
                        game_info = {
                            'date': game['gameDate'][:10],  # Extract date part
                            'opponent': away_team if is_home else home_team,
                            'home_game': is_home,
                            'status': game['status']['detailedState'],
                            'game_id': game['gamePk']
                        }
                        
                        # Add scores if game is final
                        if game['status']['detailedState'] == 'Final':
                            home_score = game['teams']['home']['score']
                            away_score = game['teams']['away']['score']
                            
                            if is_home:
                                white_sox_won = home_score > away_score
                                runs_scored = home_score
                                runs_allowed = away_score
                            else:
                                white_sox_won = away_score > home_score
                                runs_scored = away_score
                                runs_allowed = home_score
                            
                            game_info.update({
                                'result': 'W' if white_sox_won else 'L',
                                'runs_scored': runs_scored,
                                'runs_allowed': runs_allowed
                            })
                        
                        games.append(game_info)
                        print(f"✓ Found game: {game_info['date']} vs {game_info['opponent']}")
                        
                except Exception as e:
                    print(f"❌ Error processing game: {e}")
                    continue
        
        df = pd.DataFrame(games)
        print(f"✓ Alternative method collected {len(df)} games")
        return df
        
    except Exception as e:
        print(f"❌ Alternative method failed: {e}")
        return pd.DataFrame()

def save_data_to_csv(recent_games, upcoming_games):
    """
    Save collected data to CSV files for Pandas analysis
    """
    print("Saving data to CSV files...")
    
    if not recent_games.empty:
        recent_games.to_csv('whitesox_recent_games.csv', index=False)
        print("✓ Saved: whitesox_recent_games.csv")
    else:
        print("❌ No recent games data to save")
    
    if not upcoming_games.empty:
        upcoming_games.to_csv('whitesox_upcoming_games.csv', index=False)
        print("✓ Saved: whitesox_upcoming_games.csv")
    else:
        print("❌ No upcoming games data to save")

def main():
    """Main function to collect all White Sox data"""
    print("🏈 Chicago White Sox Data Collection Starting...")
    print("=" * 50)
    
    try:
        # Try the statsapi package first
        recent_games = get_whitesox_recent_games(20)
        upcoming_games = get_whitesox_upcoming_games(10)
        
        # If statsapi didn't work well, try alternative method
        if recent_games.empty:
            print("\n🔄 Trying alternative data collection method...")
            recent_games = alternative_data_collection()
            
        # Save whatever data we got
        save_data_to_csv(recent_games, upcoming_games)
        
        print("\n" + "=" * 50)
        print("✅ Data collection complete!")
        print(f"Recent games: {len(recent_games)} games")
        print(f"Upcoming games: {len(upcoming_games)} games")
        
        # Preview the data
        if not recent_games.empty:
            print("\nRecent Games Preview:")
            print(recent_games.head())
        
        if not upcoming_games.empty:
            print("\nUpcoming Games Preview:")
            print(upcoming_games.head())
        
    except Exception as e:
        print(f"❌ Error during data collection: {e}")
        print("Check your internet connection and try again.")

if __name__ == "__main__":
    # First, run debug to see API structure
    print("🔍 Running debug to examine API response...")
    debug_schedule = debug_api_response()
    
    if debug_schedule:
        print("\n" + "="*50)
        input("Press Enter to continue with main data collection...")
    
    # Run main collection regardless
    main()