module.exports = {
  "config": {
    "validation": {
      "schema": {
        "type": "object",
        "properties": {
          "enabled": {
            "type": "boolean"
          },
          "host": {
            "oneOf": [
              {
                "type": "null"
              },
              {
                "type": "string"
              }
            ]
          },
          "port": {
            "oneOf": [
              {
                "type": "number"
              },
              {
                "type": "string"
              }
            ]
          },
          "ssl": {
            "type": "object",
            "properties": {
              "enabled": {
                "type": "boolean"
              },
              "ca": {
                "type": "string"
              },
              "ca_file": {
                "type": "string"
              },
              "key": {
                "type": "string"
              },
              "key_file": {
                "type": "string"
              },
              "cert": {
                "type": "string"
              },
              "cert_file": {
                "type": "string"
              },
              "requestCert": {
                "type": "boolean"
              },
              "rejectUnauthorized": {
                "type": "boolean"
              },
            }
          },
          "verbose": {
            "type": "boolean"
          }
        }
      }
    }
  }
};
