userinput = input("What's your name? ")

print("You got this, " + userinput + "!")  # This is a simple print statement to greet the user.
print("Now how about we play a game...")

def number_guessing_game():
    import random

    number_to_guess = random.randint(1, 100)
    attempts = 0
    print("I have selected a random number between 1 and 100. Can you guess it?")

    while True:
        user_guess = int(input("Enter your guess (or 0 to quit): "))
        if user_guess == 0:
            print("Thanks for playing! Goodbye!")
            break
        attempts += 1
        if user_guess < number_to_guess - 10:
            print("Too low! Try again.")
        elif user_guess < number_to_guess and user_guess >= number_to_guess - 10:
            print("Close, but still too low! Try again.")
        elif user_guess > number_to_guess + 10:
            print("Too high! Try again.")
        elif user_guess > number_to_guess and user_guess <= number_to_guess + 10:
            print("Close, but still too high! Try again.")
        else:
            print(f"Congratulations, {userinput}! You've guessed the number in {attempts} attempts.")
            break

number_guessing_game()
# This is a simple number guessing game where the user has to guess a number between 1 and 100.
# The game provides feedback on whether the guess is too high or too low.
# The game continues until the user guesses the correct number or chooses to quit by entering 0.