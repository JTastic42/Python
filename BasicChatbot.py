def samplechatbot(user_input):
    user_input = user_input.lower()
    if "hello" in user_input:
        return "Hi there! How can I help you?"
    elif "how are you" in user_input:
        return "Doing well. I'm just getting in some bytes!"
    elif "bye" in user_input:
        return "Goodbye! Have a great day!"
    else:
        return "I'm not sure how to respond to that. Can you ask something else?"
    
while True: 
    user_input = input("You: ")
    if user_input.lower() == "exit":
        print("Chatbot: Out!")
        break
    response = samplechatbot(user_input)
    print("Chatbot:", response)