#!/usr/bin/env bash

KEY_CHAIN=osx-build.keychain
IDENTITY=A092C6443530A5B3106C48C98885B3FA3B51772A
APP="./dist/darwin/LiveStyle.app"

# sign
codesign --deep --force --verify --verbose --keychain $KEY_CHAIN --sign "$IDENTITY" "$APP"

# verify
codesign -vvvv -d "$APP"
spctl -a -vvvv "$APP"