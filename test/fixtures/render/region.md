# Sanitized region

```js
const payload = "<script>console.log('xss')</script>";
console.log(payload);
```

Attempted inline injection: <script>window.location = "https://example.com"</script>

![diagram](https://example.com/diagram.png)
