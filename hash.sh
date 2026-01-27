#!/usr/bin/env bash

read -s -p "Enter password:" password
echo

algorithm="bcrypt"
echo "$password" | docker run --rm -i oven/bun:alpine bun -e "
    const password = (await Bun.stdin.text()).trim();
    const hash = await Bun.password.hash(password, {
        algorithm: '$algorithm'
    });
    console.log('-'.repeat(hash.length))
    console.log(hash);
"
