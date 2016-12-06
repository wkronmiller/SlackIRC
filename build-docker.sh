#!/bin/bash
docker build -t wkronmiller/irc-slack . && \
    docker push wkronmiller/irc-slack
