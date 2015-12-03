#!/usr/bin/env bash

KEY_CHAIN=osx-build.keychain

# create keychain
security create-keychain -p travis $KEY_CHAIN
security default-keychain -s $KEY_CHAIN
security unlock-keychain -p travis $KEY_CHAIN
security set-keychain-settings -t 3600 -u $KEY_CHAIN

security import ./livestyle.cer -k $KEY_CHAIN -T /usr/bin/codesign
security import ./livestyle.p12 -k $KEY_CHAIN -P $CERT_ACCESS -T /usr/bin/codesign
