# Keystroke Chronicle

## Project Description

Keystroke Chronicle is a utility designed for ethically capturing and logging keystroke data.  It provides a detailed record of keyboard input, facilitating the understanding of user input patterns and techniques. This tool is intended for responsible use, such as:

* Debugging and testing input devices or software.
* Analyzing user interaction for accessibility improvements.
* Educational purposes in studying human-computer interaction.

**Disclaimer:** This tool is for ethical and legal use only.  It should not be used for any form of surveillance, unauthorized data collection, or any other malicious activity.  Users are responsible for complying with all applicable laws and regulations.

## Features

* **Keystroke Recording:** Captures all keyboard inputs in real-time with high precision.
* **Timestamped Logging:** Records each keystroke with a timestamp, enabling precise timing analysis.
* **Configurable Recording:** Target specific applications or system-wide input.
* **Live Monitoring:** Provides a real-time display of captured keystrokes.
* **Log Storage:** Stores captured keystrokes locally in a structured log file.
* **Export Functionality:** Exports keystroke data to a plain text file for external analysis.
* **Keystroke Categorization:** Displays keystrokes by category (alphanumeric, symbols, function keys, etc.)
* **Real-time Statistics:** Displays keystrokes per second/minute and key press frequency.
* **Key Press Frequency Chart:** Visual representation of most frequently used keys.
* **Keystroke Filtering:** Users can select which categories of keystrokes to display.

## Technologies Used

* **Programming Language:** JavaScript/TypeScript
* **Framework:** React
* **UI Library:** Tailwind CSS
* **State Management:** React
* **Other:** Gemini API

## Installation Guide

1.  **Prerequisites:**
    * [Node.js](https://nodejs.org/) (Version 18 or higher)
    * [npm](https://www.npmjs.com/) (usually included with Node.js)
    * [Git](https://git-scm.com/)

2.  **Clone the repository:**
    ```bash
    git clone <your_repository_url>
    ```
    *Replace `<your_repository_url>` with the actual URL of your project's repository.*

3.  **Navigate to the project directory:**
    ```bash
    cd your_project_directory_name
    ```
    *Replace `your_project_directory_name` with the name of the directory that was created when you cloned the repository.*

4.  **Install dependencies:**
    ```bash
    npm install
    ```

5.  **Configuration:**
     * Create a `.env` file in the project root.
     * Add your Gemini API key to the `.env` file:
       ```
       GEMINI_API_KEY=YOUR_API_KEY
       ```
       *Replace `YOUR_API_KEY` with your actual Gemini API key.*

6.  **Run the application:**
    ```bash
    npm run dev
    ```

## Usage Examples

1.  **Starting the application:**
    * Open a terminal and navigate to the project directory.
    * Run the command `npm run dev`.
    * The application will open in your web browser.

2.  **Recording keystrokes:**
    * Click the "Start Recording" button.
    * The application will begin capturing keystrokes from your keyboard.
    * The live keystrokes will be displayed in the "Live Keystrokes" section.

3.  **Viewing live metrics:**
    * The "Real-time Stats" section will display:
        * Keystrokes Per Second (KPS)
        * Keystrokes Per Minute (KPM)
        * A list of the most frequently used keys.

4.  **Filtering keystrokes:**
        * Use the category filters to show/hide different types of keystrokes.

5.  **Exporting keystroke logs:**
    * Click the "Export Logs" button.
    * The captured keystroke data will be saved to a text file.

6.  **Clearing keystroke logs:**
     * Click the "Clear Logs" button.
     * The captured keystroke data will be cleared from the display.

## Contributing Guidelines

We welcome contributions to Keystroke Chronicle! To contribute, please follow these guidelines:

1.  **Fork the repository:**
    * Go to the project's GitHub page.
    * Click the "Fork" button.

2.  **Create a new branch:**
    * Clone your forked repository to your local machine.
    * Create a new branch for your changes:
        ```bash
        git checkout -b feature/your-feature-name
        ```

3.  **Make your changes:**
    * Write clear, maintainable code.
    * Follow the project's coding style.
    * Document your changes.

4.  **Write tests:**
    * If applicable, write tests to ensure your changes are working correctly.

5.  **Commit your changes:**
     * Use clear and concise commit messages, following the Conventional Commits specification (https://conventionalcommits.org/).

6.  **Submit a pull request:**
    * Push your branch to your forked repository on GitHub.
    * Create a pull request to the main branch of the original repository.
    * Provide a clear description of your changes in the pull request.

## License Information

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

