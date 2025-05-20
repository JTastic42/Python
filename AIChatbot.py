from transformers import pipeline

# Load pre-trained conversational model
chatbot = pipeline("question-answering", model="facebook/blenderbot-400M-distill")

while True:
    user_input = input("You: ")
    if user_input.lower() == "exit":
        break
    response = chatbot(user_input)
    print("Bot:", response[0]['generated_text'])
