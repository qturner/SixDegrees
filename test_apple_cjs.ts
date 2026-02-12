
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
    const appleSignin = require("apple-signin-auth");
    console.log("Require successful");
    console.log("Keys:", Object.keys(appleSignin));
} catch (e) {
    console.log("Require failed:", e.message);
}
