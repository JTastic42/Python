print("""Welcome to my new app! The Weight Calculator.
This app will tell you how many plates at each standard weight you need to achieve your desired goal.""")

def get_weight():
    """This will get the weight value from the user.
    In addition, the function will check if the input is valid. The value should be positive, numeric,
    and can contain one decimal place (only 0 or 5 is allowed after the decimal point)."""
    while True:
        try:
            user_input = input("Please enter the desired weight for the exercise.: ")

            # Check if the input is numeric and can be converted to float
            weight = float(user_input)

            # Check if the weight is a positive number
            if weight <= 0:
                print("The weight must be a positive number. Please try again.")
                continue

            if '.' in user_input:
                # Has decimal point - check for exactly one decimal place
                decimal_part = user_input.split('.')[1]
                if len(decimal_part) != 1:
                    print("Error: Please enter exactly one decimal place (e.g., 5.0 or 5.5)")
                    continue
                # Check if decimal is 0 or 5
                if decimal_part not in ['0', '5']:
                    print("Error: Decimal place must be .0 or .5 (e.g., 5.0 or 5.5)")
                    continue

                #if all checks passed, return the weight
            return weight
        
        except ValueError:
            print("Error: Please enter a valid number.")
        except KeyboardInterrupt:
            print("\nOperation cancelled by user.")
            return None
        
def calculate_plates(target_weight):
    """
    Calculate the minimum number of plates needed to achieve the target weight.
    
    Args:
        target_weight (float): The desired weight to achieve
        
    Returns:
        dict: Contains plate breakdown, actual weight achieved, and whether exact match
    """
    # Available plate weights (in descending order for greedy algorithm)
    plate_weights = [45, 25, 10, 5, 2.5]
    
    # Initialize plate counts
    plate_counts = {weight: 0 for weight in plate_weights}
    remaining_weight = target_weight
    
    # Greedy algorithm: use largest plates first
    for plate_weight in plate_weights:
        if remaining_weight >= plate_weight:
            count = int(remaining_weight // plate_weight)
            plate_counts[plate_weight] = count
            remaining_weight -= count * plate_weight
            remaining_weight = round(remaining_weight, 1)  # Handle floating point precision
    
    # Calculate actual weight achieved
    actual_weight = sum(count * weight for weight, count in plate_counts.items())
    
    # Check if we achieved exact match
    exact_match = abs(actual_weight - target_weight) < 0.01
    
    return {
        'plate_counts': plate_counts,
        'actual_weight': actual_weight,
        'target_weight': target_weight,
        'exact_match': exact_match,
        'total_plates': sum(plate_counts.values())
    }


def display_results(result):
    """
    Display the plate calculation results in a formatted way.
    
    Args:
        result (dict): Result from calculate_plates function
    """
    print("\n" + "="*50)
    print("PLATE CALCULATION RESULTS")
    print("="*50)
    
    print(f"Target Weight: {result['target_weight']} lbs")
    print(f"Actual Weight: {result['actual_weight']} lbs")
    
    if result['exact_match']:
        print("✓ Exact match achieved!")
    else:
        difference = result['actual_weight'] - result['target_weight']
        print(f"✗ Difference: {difference:+.1f} lbs")
    
    print(f"\nTotal Plates Needed: {result['total_plates']}")
    print("\nPlate Breakdown:")
    print("-" * 25)
    
    for weight, count in result['plate_counts'].items():
        if count > 0:
            total_weight = weight * count
            print(f"{weight:4.1f} lb plates: {count:2d} × {weight:4.1f} = {total_weight:5.1f} lbs")
    
    print("-" * 25)
    print(f"Total Weight: {result['actual_weight']} lbs")


def get_yes_no_input(prompt):
    """
    Get yes/no input from user with validation.
    
    Args:
        prompt (str): The question to ask the user
        
    Returns:
        bool: True for yes, False for no, None for cancelled
    """
    while True:
        try:
            response = input(f"{prompt} (y/n): ").lower().strip()
            if response in ['y', 'yes']:
                return True
            elif response in ['n', 'no']:
                return False
            else:
                print("Please enter 'y' for yes or 'n' for no.")
        except KeyboardInterrupt:
            print("\nOperation cancelled by user.")
            return None


def main():
    """
    Main application loop for the gym plate calculator.
    """
    print("Welcome to the Gym Plate Calculator!")
    print("This tool helps you find the minimum plates needed for your target weight.")
    print("Available plates: 45, 25, 10, 5, and 2.5 lbs\n")
    
    while True:
        # Get target weight from user
        target = get_weight()
        if target is None:  # User cancelled
            print("Goodbye!")
            break
        
        # Calculate and display results
        result = calculate_plates(target)
        display_results(result)
        
        # Ask if user wants to continue
        print("\n" + "="*50)
        continue_choice = get_yes_no_input("Would you like to calculate another weight?")
        
        if continue_choice is None:  # User cancelled
            print("Goodbye!")
            break
        elif continue_choice:  # User wants to continue
            print("\n" + "="*50)
            continue
        else:  # User wants to exit
            print("\nThank you for using the Gym Plate Calculator!")
            print("Stay strong! 💪")
            break


# Example usage
if __name__ == "__main__":
    main()