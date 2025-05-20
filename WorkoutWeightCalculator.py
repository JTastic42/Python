from flask import Flask, render_template, request, session

def calculate_plates(target_weight):
    bar_weight = 45
    available_plates = [45, 25, 10, 5, 2.5]
    plates_needed = {}
    remaining_weight = (target_weight - bar_weight) / 2  # Divide by 2 since plates go on both sides
    original_target = remaining_weight * 2 + bar_weight

    for plate in available_plates:
        if remaining_weight >= plate:
            num_plates = int(remaining_weight / plate)
            plates_needed[plate] = num_plates
            remaining_weight -= (plate * num_plates)

    actual_weight = bar_weight + sum(weight * count * 2 for weight, count in plates_needed.items())
    
    return plates_needed, actual_weight, original_target

def main():
    app = Flask(__name__)
    app.secret_key = 'your_secret_key'  # Required for session management

    @app.route('/', methods=['GET', 'POST'])
    def home():
        if 'history' not in session:
            session['history'] = []

        result = None
        if request.method == 'POST':
            try:
                target_weight = float(request.form['weight'])
                plates, actual_weight, target = calculate_plates(target_weight)
                result = {
                    'plates': plates,
                    'actual_weight': actual_weight,
                    'target_weight': target
                }
                # Add to history, keeping only last 10 entries
                session['history'] = [result] + session['history'][:9]
                session.modified = True
            except ValueError:
                result = {'error': 'Please enter a valid weight'}

        return render_template('index.html', result=result, history=session['history'])

    def format_plates(plates):
        return ' (' + ', '.join(f'{count}x{weight}' for weight, count in plates.items()) + ')'

    @app.route('/', methods=['GET', 'POST'])
    def format_history_entry(entry):
        if 'error' in entry:
            return entry
        plates_str = format_plates(entry['plates'])
        return {
            'actual_weight': entry['actual_weight'],
            'target_weight': entry['target_weight'],
            'plates_str': plates_str
        }

    app.jinja_env.filters['format_history'] = format_history_entry
    app.run(debug=True)
    # Make format_plates function available to templates
    app.jinja_env.filters['format_plates'] = format_plates
    print("Thank you for using the Weight Plate Calculator!")

if __name__ == "__main__":
    main()