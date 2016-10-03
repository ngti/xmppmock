docker-build:
	docker build -t xmppmock .

docker-run:
	docker run -it -p 6666:6666 -p 3000:3000 -p 5222:5222 -p 443:443 --rm --name xmppmock-1 xmppmock

run: docker-build docker-run

runrepo:
	docker run -it -p 6666:6666 -p 3000:3000 -p 5222:5222 -p 443:443 --rm --name xmppmock-1 reg.cp.ngti.nl/xmppmock

push: docker-build
	docker tag xmppmock reg.cp.ngti.nl/xmppmock:0.0.9
	docker push reg.cp.ngti.nl/xmppmock:0.0.9
