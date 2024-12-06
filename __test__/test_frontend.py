from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

# Initialize the WebDriver
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service)

try:
    # 1. Navigate to local homepage URL
    driver.get("http://localhost:3000")  # Replace with your actual local URL
    driver.maximize_window()
    time.sleep(2)

    # 2. Verify the page title
    assert "Package Manager" in driver.title, "Title verification failed"
    print("Homepage title verification passed")

    # 3. Click the "Login" button to verify the login form appears
    login_button = driver.find_element(By.XPATH, "//button[text()='Login']")
    login_button.click()
    time.sleep(2)

    # 4. Verify the login form fields and buttons
    username_field = driver.find_element(
        By.XPATH, "//input[@placeholder='Username']")
    password_field = driver.find_element(
        By.XPATH, "//input[@placeholder='Password']")
    login_button = driver.find_element(
        By.XPATH, "//button[text()='Login']")
    signup_button = driver.find_element(
        By.XPATH, "//button[text()='Sign Up']")

    assert username_field.is_displayed(), "Username field not found"
    assert password_field.is_displayed(), "Password field not found"
    assert login_button.is_displayed(), "Login button not found"
    assert signup_button.is_displayed(), "Sign Up button not found"

    # Enter test credentials and click the "Login" button
    username_field.send_keys("testuser")
    password_field.send_keys("password123")
    login_button.click()
    time.sleep(2)

    # 5. Verify the homepage elements (ensure login was successful)
    logout_button = driver.find_element(
        By.XPATH, "//button[text()='Log Out']")
    assert logout_button.is_displayed(), "Logout button not found"
    print("Login test passed and homepage loaded")

    # 6. Test the logout functionality
    logout_button.click()  # Log out from the homepage
    time.sleep(2)  # Wait for the login page to appear

    # 7. Verify that you're back on the login page
    login_button = driver.find_element(
        By.XPATH, "//button[text()='Login']")
    assert login_button.is_displayed(), "Login not on login page after logout"
    print("Logout test passed successfully")

    # 8. Test the signup page after logout
    login_button.click()  # Click the login button to verify the signup
    time.sleep(2)  # Wait for the login page to appear
    signup_button = driver.find_element(By.XPATH, "//button[text()='Sign Up']")
    signup_button.click()
    time.sleep(2)  # Wait for the signup form to display

    # Verify the signup form fields and buttons
    email_field = driver.find_element(
        By.XPATH, "//input[@placeholder='Email']")
    username_field = driver.find_element(
        By.XPATH, "//input[@placeholder='Username']")
    password_field = driver.find_element(
        By.XPATH, "//input[@placeholder='Password']")
    reenter_field = driver.find_element(
        By.XPATH, "//input[@placeholder='Password']")
    signup_button = driver.find_element(
        By.XPATH, "//button[text()='Sign Up']")

    assert email_field.is_displayed(), "Email field not found"
    assert username_field.is_displayed(), "Username field not found"
    assert password_field.is_displayed(), "Password field not found"
    assert reenter_field.is_displayed(), "Re-enter password field not found"
    assert signup_button.is_displayed(), "Sign Up button not found"

    # Enter test credentials for signup
    email_field.send_keys("email@mail.com")
    username_field.send_keys("testuser")
    password_field.send_keys("password123")
    reenter_field.send_keys("password123")
    time.sleep(2)  # Wait for the fields to populate

    # Simulate clicking the "Sign-up" button
    signup_button.click()
    time.sleep(3)  # Wait for any response

    # Verify that you are on the homepage after signup
    search_input = driver.find_element(
        By.XPATH, "//input[@placeholder='Search for packages...']")
    search_button = driver.find_element(
        By.XPATH, "//button[text()='Search']")
    upload_button = driver.find_element(
        By.XPATH, "//button[text()='Upload Package']")
    logout_button = driver.find_element(
        By.XPATH, "//button[text()='Log Out']")

    assert search_input.is_displayed(), "Search input not found"
    assert search_button.is_displayed(), "Search button not found"
    assert upload_button.is_displayed(), "Upload button not found"
    assert logout_button.is_displayed(), "Logout button not found"

    print("Signup test passed successfully")

    # 9. Test the search functionality
    search_input = driver.find_element(By.CLASS_NAME, "search-input")
    search_input.send_keys("test package")
    assert search_input.get_attribute("value") == "test package", \
        "Search input failed"

    # Simulate the displayS3Files function
    search_button = driver.find_element(By.CLASS_NAME, "search-button")
    search_button.click()
    time.sleep(2)  # Wait for the file names to display

    print("Search test passed successfully")

    # 10. Test the upload package functionality
    upload_button = driver.find_element(
        By.XPATH, "//button[text()='Upload Package']")
    assert upload_button.is_displayed(), "Upload button not found"

    # Click the "Upload Package" button
    upload_button.click()
    time.sleep(2)

    # Select the ZIP file radio button
    zip_radio_button = driver.find_element(
        By.XPATH, "//input[@name='uploadType' and @value='zip']")
    assert zip_radio_button.is_selected(), "ZIP radio button not selected."
    time.sleep(1)

    # Test file upload
    choose_file_button = driver.find_element(By.NAME, "fileUpload")
    assert choose_file_button.is_displayed(), "Choose file button not visible"
    time.sleep(1)

    # Test uploading a file ?

    # Toggle the debloat checkbox
    debloat_checkbox = driver.find_element(
        By.XPATH, "//input[@type='checkbox']")
    debloat_checkbox.click()
    assert debloat_checkbox.is_selected(), "Debloat checkbox not toggled on"
    time.sleep(1)

    # Test URL upload
    url_radio_button = driver.find_element(
        By.XPATH, "//input[@type='radio' and @name='uploadTypeURL']")
    driver.execute_script("arguments[0].click();", url_radio_button)
    assert url_radio_button.is_selected(), "URL option not selected."
    time.sleep(2)

    # Check for URL input field
    url_input = driver.find_element(By.XPATH, "//input[@id='url']")
    assert url_input.is_displayed(), "URL input not visible."

    # Test Debloat toggle
    assert debloat_checkbox.is_selected(), "Debloat checkbox not working."

    # Toggle the debloat checkbox
    debloat_checkbox.click()
    assert not debloat_checkbox.is_selected(), "Debloat checkbox not working."
    print("Upload test passed successfully")

    # Test clicking submit without URL

    # Check adding URL

    # Test clicking submit button

    # 11. Test the back button from upload page and functionality
    back_button = driver.find_element(By.XPATH, "//button[text()='Back']")
    assert back_button.is_displayed(), "Back button not found"
    back_button.click()  # Navigate back to the homepage
    time.sleep(2)
    print("Back navigation passed successfully")

    assert driver.title == "Package Manager", \
        "Not on homepage after pressing back"

    # Test the search functionality after back navigation

    search_input = driver.find_element(By.CLASS_NAME, "search-input")
    search_input.send_keys("test package")
    assert search_input.get_attribute("value") == "test package", \
        "Search input failed"

    # Simulate the displayS3Files function
    search_button = driver.find_element(By.CLASS_NAME, "search-button")
    search_button.click()
    time.sleep(2)  # Wait for the file names to display

    # 12. Back to the "View Package" page for functionality testing
    viewpackage_button = driver.find_element(
        By.XPATH, "//button[text()='View Package']")
    assert viewpackage_button.is_displayed(), "View Package button not found"
    viewpackage_button.click()
    time.sleep(2)
    download_button = driver.find_element(
        By.XPATH, "//button[text()='Download Package']")
    update_button = driver.find_element(
        By.XPATH, "//button[text()='Update Package']")

    assert download_button.is_displayed(), "Download Package button not found"
    assert update_button.is_displayed(), "Update Package button not found"

    print("View Package passed successfully")

    # 12. Test "Update Package" button navigation

    update_button.click()
    time.sleep(2)

    # Get the heading text
    heading = driver.find_element(By.TAG_NAME, "h1").text
    assert heading == "Update Package", \
        f"Not on update page. Current heading: {heading}"

    # Check for the back button
    back_button = driver.find_element(By.XPATH, "//button[text()='Back']")
    assert back_button.is_displayed(), "Back button not found"
    back_button.click()
    time.sleep(2)

    print("Update Package navigation passed successfully")

finally:
    # Close the browser
    driver.quit()
