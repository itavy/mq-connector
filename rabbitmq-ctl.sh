#!/usr/bin/env bash
MQ_CONNECTOR_DOCKER_CONTAINER="itavy-mq-connector-rabbitmq";
MQ_CONNECTOR_DOCKER_IMAGE="itavy-mq-connector-rabbitmq-img"

dockerExists() {
  local result=$(docker ps -aq -f name=${MQ_CONNECTOR_DOCKER_CONTAINER});
  echo "$result";
}

dockerIsStopped() {
  local result=$(docker ps -q -f status=exited -f name=${MQ_CONNECTOR_DOCKER_CONTAINER});
  echo "$result";
}

dockerImageExists() {
  local result=$(docker images -qf reference=${MQ_CONNECTOR_DOCKER_IMAGE});
  echo "$result";
}

buildDocker() {
  docker build \
    -t ${MQ_CONNECTOR_DOCKER_IMAGE} \
    -f ./Docker/Dockerfile \
    ./Docker/
}

defineDocker() {
  if [ "$(dockerExists)" != "" ]; then
    echo "Container ${MQ_CONNECTOR_DOCKER_CONTAINER} already defined! erase it before defining it";
  else
    echo "Container ${MQ_CONNECTOR_DOCKER_CONTAINER} not defined!";
    if [ "$(dockerImageExists)" == "" ]; then
      echo "Image ${MQ_CONNECTOR_DOCKER_IMAGE} not defined!";
      echo "Build image ${MQ_CONNECTOR_DOCKER_IMAGE}!";
      buildDocker
    fi
    echo "Definig and starting ${MQ_CONNECTOR_DOCKER_CONTAINER}!";
    docker run \
      -d \
      --name ${MQ_CONNECTOR_DOCKER_CONTAINER} \
      --hostname ${MQ_CONNECTOR_DOCKER_CONTAINER} \
      -p 4369:4369 \
      -p 5671:5671 \
      -p 5672:5672 \
      -p 25672:25672 \
      -p 15671:15671 \
      -p 15672:15672 \
      ${MQ_CONNECTOR_DOCKER_IMAGE}
  fi
}

stopDocker() {
  if [ "$(dockerIsStopped)" == "" ]; then
    echo "Stoping container ${MQ_CONNECTOR_DOCKER_CONTAINER}!";
    docker stop ${MQ_CONNECTOR_DOCKER_CONTAINER};
  else
    echo "Container ${MQ_CONNECTOR_DOCKER_CONTAINER} is not running!"
  fi
}

startDocker() {
  if [ "$(dockerExists)" != "" ]; then
    if [ "$(dockerIsStopped)" != "" ]; then
      echo "Starting container ${MQ_CONNECTOR_DOCKER_CONTAINER}"
      docker start ${MQ_CONNECTOR_DOCKER_CONTAINER};
    else
      echo "Container ${MQ_CONNECTOR_DOCKER_CONTAINER} is already running!";
    fi
  else
    defineDocker
  fi
}

eraseDocker() {
  if [ "$(dockerExists)" != "" ]; then
    if [ "$(dockerIsStopped)" != "" ]; then
      echo "Erasing ${MQ_CONNECTOR_DOCKER_CONTAINER}"
      docker rm ${MQ_CONNECTOR_DOCKER_CONTAINER};
    else
      echo "Container ${MQ_CONNECTOR_DOCKER_CONTAINER} is running; stop it before erasing it!";
    fi
  else
    echo "Container ${MQ_CONNECTOR_DOCKER_CONTAINER} is not defined; cannot erase!";
  fi
}

printUsage() {
  echo "$0 [start|stop|define|build|rm]";
}

case "$1" in
  "start")
    startDocker
    ;;
  "stop")
    stopDocker
    ;;
  "define")
    defineDocker
    ;;
  "build")
    buildDocker
    ;;
  "rm")
    eraseDocker
    ;;
  *)
    printUsage
    exit 1
    ;;
esac
