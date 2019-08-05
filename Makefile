deploy: clean build
	aws s3 sync dist s3://flashcards.jdbernard.com
	rm -r dist

serve-local:
	(cd dist && python -m SimpleHTTPServer &)
	./makewatch build

build: flashcards.*
	-mkdir dist
	cp flashcards.* dist
	git describe --always --dirty --tags | xargs --replace=INSERTED -- sed -i -e 's/%VERSION%/INSERTED/' dist/*

clean:
	-rm -r dist
