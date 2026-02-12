
import appleSignin from "apple-signin-auth";

console.log("Successfully imported apple-signin-auth");
console.log("appleSignin object:", appleSignin);

try {
    if (typeof appleSignin.verifyIdToken === 'function') {
        console.log("verifyIdToken is a function");
    } else {
        console.error("verifyIdToken is NOT a function");
    }
} catch (e) {
    console.error("Error checking function:", e);
}
