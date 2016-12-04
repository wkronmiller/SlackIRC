#!/bin/bash
docker build -t wkronmiller/rss-slack . && \
    docker push wkronmiller/rss-slack
