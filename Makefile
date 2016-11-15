.PHONY : build run docker-build docker-run stop integration venv dev-run

VERSION=0.1.3
REPO_VERSION=0.0.11

venv: venv/bin/activate

venv/bin/activate: requirements.txt
	test -d venv || virtualenv venv
	venv/bin/pip install -Ur requirements.txt
	touch venv/bin/activate

docker-build:
	docker build -t xmppmock .

docker-run:
	docker run -it --rm -p 6666:6666 -p 3000:3000 -p 5222:5222 -p 443:443 --rm --name xmppmock-1 xmppmock

run: docker-build docker-run

dev-run:
	hot-reload src/app.js

runrepo:
	docker run -it --rm -p 6666:6666 -p 3000:3000 -p 5222:5222 -p 443:443 --rm --name xmppmock-1 reg.cp.ngti.nl/xmppmock:$(REPO_VERSION)

stop:
	docker stop xmppmock-1

push: docker-build
	docker tag xmppmock reg.cp.ngti.nl/xmppmock:$(VERSION)
	docker push reg.cp.ngti.nl/xmppmock:$(VERSION)

integration: venv
	. ./venv/bin/activate
	venv/bin/python -m robot -d test/log --loglevel DEBUG \
		-v DOCKER_HOST:${docker-host} \
		-v MEMCACHED_HOST:${memcached_host} \
		test/robot
